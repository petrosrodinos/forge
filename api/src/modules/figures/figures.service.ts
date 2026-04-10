import type { ChatCompletionRequest } from "../../integrations/aimlapi/types";
import { prisma } from "../../integrations/db/client";
import { deleteGcsFiles } from "../../integrations/gcs/gcs.service";
import { collectGcsKeysFromFigure } from "../../integrations/gcs/collectGcsAssetKeys";
import { agentModel, getAiml } from "../../services";
import * as skinImageSvc from "../skin-images/skin-images.service";

import type { CreateFigureInput, UpdateFigureInput } from "./interfaces/figures.types";
import type { AiVariantContext, GenerateAiVariantInput, GenerateFigureImageInput } from "./interfaces/figures.generation.types";
import {
  createFigure as createFigureRepo,
  deleteFigure as deleteFigureRepo,
  getFigureById as getFigureByIdRepo,
  listFigures as listFiguresRepo,
  resolveSkin,
  upsertSkinVariant,
  updateFigure as updateFigureRepo,
} from "./repositories/figures.repository";
import { applyNegativePrompt } from "./helpers/negativePrompt.helper";
import { safeParseJsonObject } from "./helpers/safeJsonObjectParse.helper";
import { FIGURES_CONFIG } from "./config/figures.config";
import { IMAGES_CONFIG } from "../images/config/images.config";
import { listImageModels } from "../images/images.service";
import { usageMetadataWithProviderCosts } from "../../lib/provider-costs-metadata";
import {
  assertUserHasTokenBalance,
  debitForImageModel,
  debitForOperation,
  getDebitTokensForImageModel,
} from "../tokens/tokens.service";
import {
  AI_VARIANT_SYSTEM_PROMPT,
  buildAiVariantUserPrompt,
  HUMAN_RIG_GUIDANCE,
  OBJECT_RIG_GUIDANCE,
} from "../../config/ai-prompts/figures/aiVariant.prompts";

/** Sentinel userId for seeded template figures */
export const SEED_USER_ID = "000000000000000000000000";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableAimlChatError(err: unknown): boolean {
  const e = err as { upstreamStatus?: number; code?: string };
  const u = e.upstreamStatus ?? 0;
  if (u === 524 || u === 502 || u === 503 || u === 504) return true;
  return e.code === "ECONNABORTED";
}

async function aimlChatCompletionWithRetry(body: ChatCompletionRequest) {
  const maxAttempts = 3;
  let last: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await getAiml().chatCompletion(body);
    } catch (e) {
      last = e;
      if (i < maxAttempts - 1 && isRetryableAimlChatError(e)) {
        await sleep(2500 * (i + 1));
        continue;
      }
      throw e;
    }
  }
  throw last;
}

export async function listFigures(userId: string) {
  return listFiguresRepo(userId);
}

export async function getFigureById(userId: string, id: string) {
  return getFigureByIdRepo(userId, id);
}

export async function createFigure(userId: string, input: CreateFigureInput) {
  return createFigureRepo(userId, input);
}

export async function updateFigure(userId: string, id: string, input: UpdateFigureInput) {
  return updateFigureRepo(userId, id, input);
}

export async function deleteFigure(userId: string, id: string) {
  const existing = await getFigureByIdRepo(userId, id);
  if (!existing) return null;
  await deleteGcsFiles(collectGcsKeysFromFigure(existing));
  return deleteFigureRepo(userId, id);
}

export async function generateAndSaveFigureImage(userId: string, input: GenerateFigureImageInput) {
  const {
    figureId,
    skinName,
    variant,
    model = IMAGES_CONFIG.DEFAULT_AIML_IMAGE_MODEL,
    prompt,
    negativePrompt,
    size,
    steps,
  } = input;

  const resolvedSkin = await resolveSkin(userId, figureId, skinName);

  if (!resolvedSkin) {
    throw new Error("Skin not found for figure");
  }

  await assertUserHasTokenBalance(userId, getDebitTokensForImageModel(model));

  const variantRecord = await upsertSkinVariant({
    skinId: resolvedSkin.id,
    variant,
    imageModel: model,
    prompt,
    negativePrompt,
  });

  const finalPrompt = applyNegativePrompt(prompt, negativePrompt);
  const { data: generated, costsMetadata } = await getAiml().generateImage({
    model,
    prompt: finalPrompt,
    size,
    steps,
  });

  const first = generated.data?.[0];
  const imageUrl =
    first?.url ??
    (first?.b64_json ? `data:image/png;base64,${first.b64_json}` : null);

  if (!imageUrl) throw new Error("No image in generation response");

  await debitForImageModel(
    userId,
    model,
    undefined,
    usageMetadataWithProviderCosts(costsMetadata, "aimlapi"),
  );

  const savedImage = await skinImageSvc.createSkinImage(
    variantRecord.id,
    figureId,
    imageUrl,
    {
      prompt,
      negativePrompt: negativePrompt?.trim() || undefined,
      model,
    },
  );

  return {
    imageUrl,
    skinId: resolvedSkin.id,
    variantId: variantRecord.id,
    image: savedImage,
  };
}

export async function generateAiVariant(userId: string, input: GenerateAiVariantInput): Promise<{
  model?: string;
  prompt: string;
  negativePrompt: string;
}> {
  await debitForOperation(userId, "chat");

  const ctx: AiVariantContext = input.context ?? {};
  const figureType = (ctx.figureType ?? "figure").toLowerCase();
  const descriptionLower = input.description.toLowerCase();
  const available = listImageModels().map((m) => ({ id: m.id, label: m.label }));

  const chosenModel =
    (ctx.existingModel && available.some((m) => m.id === ctx.existingModel) ? ctx.existingModel : undefined) ??
    FIGURES_CONFIG.AI_VARIANT_MODEL_PREFERENCE.find((id) => available.some((m) => m.id === id)) ??
    available[0]?.id ??
    undefined;

  const shouldTreatAsObject =
    figureType !== "figure" ||
    /(robot|mech|vehicle|car|truck|plane|boat|train|droid|android|prop|weapon|tool|machine|gear|gearbox|gun|sword|axe|shield|helmet|chair|table|bench|rock|statue|tree|plant|lamp|robotic|mechanical)/i.test(
      descriptionLower
    );

  const rigGuidance = shouldTreatAsObject ? OBJECT_RIG_GUIDANCE : HUMAN_RIG_GUIDANCE;
  const systemPrompt = AI_VARIANT_SYSTEM_PROMPT;
  const userPrompt = buildAiVariantUserPrompt({
    variant: input.variant,
    figureName: ctx.figureName,
    figureType: ctx.figureType ?? "figure",
    skinName: ctx.skinName,
    description: input.description,
    existingPrompt: ctx.existingPrompt,
    existingNegPrompt: ctx.existingNegPrompt,
    otherVariantPrompt: ctx.otherVariantPrompt,
    rigGuidance,
  });

  const response = await aimlChatCompletionWithRetry({
    model: agentModel(),
    temperature: 0.2,
    max_tokens: 700,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices?.[0]?.message?.content ?? "";
  const parsed = safeParseJsonObject(content);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("AI variant generation returned non-JSON output");
  }

  const prompt = (parsed as any).prompt;
  const negativePrompt = (parsed as any).negativePrompt;
  if (typeof prompt !== "string" || !prompt.trim()) throw new Error("AI variant generation missing prompt");
  if (typeof negativePrompt !== "string" || !negativePrompt.trim()) {
    throw new Error("AI variant generation missing negativePrompt");
  }

  const modelFromAi = (parsed as any).model;
  const model =
    typeof modelFromAi === "string" && modelFromAi.trim()
      ? modelFromAi.trim()
      : chosenModel;

  return { model, prompt: prompt.trim(), negativePrompt: negativePrompt.trim() };
}

