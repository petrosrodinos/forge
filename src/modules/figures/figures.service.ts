import { agentModel, getAiml } from "../../services";
import * as skinImageSvc from "../skin-images/skin-images.service";

import type { CreateFigureInput, UpdateFigureInput } from "../../interfaces/figures/figures.types";
import type { AiVariantContext, GenerateAiVariantInput, GenerateFigureImageInput } from "../../interfaces/figures/figures.generation.types";
import {
  createFigure as createFigureRepo,
  deleteFigure as deleteFigureRepo,
  getFigureById as getFigureByIdRepo,
  listFigures as listFiguresRepo,
  resolveSkin,
  upsertSkinVariant,
  updateFigure as updateFigureRepo,
} from "../../repositories/figures/figures.repository";
import { applyNegativePrompt } from "../../helpers/negativePrompt.helper";
import { safeParseJsonObject } from "../../helpers/safeJsonObjectParse.helper";
import { AI_VARIANT_MODEL_PREFERENCE } from "../../constants/aiVariant";
import { DEFAULT_AIML_IMAGE_MODEL } from "../../constants/aimlModels";
import {
  AI_VARIANT_SYSTEM_PROMPT,
  buildAiVariantUserPrompt,
  HUMAN_RIG_GUIDANCE,
  OBJECT_RIG_GUIDANCE,
} from "../../ai-prompts/figures/aiVariant.prompts";

export async function listFigures() {
  return listFiguresRepo();
}

export async function getFigureById(id: string) {
  return getFigureByIdRepo(id);
}

export async function createFigure(input: CreateFigureInput) {
  return createFigureRepo(input);
}

export async function updateFigure(id: string, input: UpdateFigureInput) {
  return updateFigureRepo(id, input);
}

export async function deleteFigure(id: string) {
  return deleteFigureRepo(id);
}

export async function generateAndSaveFigureImage(input: GenerateFigureImageInput) {
  const {
    figureId,
    skinName,
    variant,
    model = DEFAULT_AIML_IMAGE_MODEL,
    prompt,
    negativePrompt,
    size,
    steps,
  } = input;

  const resolvedSkin = await resolveSkin(figureId, skinName);

  if (!resolvedSkin) {
    throw new Error("Skin not found for figure");
  }

  const variantRecord = await upsertSkinVariant({
    skinId: resolvedSkin.id,
    variant,
    imageModel: model,
    prompt,
    negativePrompt,
  });

  const finalPrompt = applyNegativePrompt(prompt, negativePrompt);
  const generated = await getAiml().generateImage({
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

  const savedImage = await skinImageSvc.createSkinImage(
    variantRecord.id,
    figureId,
    imageUrl
  );

  return {
    imageUrl,
    skinId: resolvedSkin.id,
    variantId: variantRecord.id,
    image: savedImage,
  };
}

export async function generateAiVariant(input: GenerateAiVariantInput): Promise<{
  model?: string;
  prompt: string;
  negativePrompt: string;
}> {
  const ctx: AiVariantContext = input.context ?? {};
  const figureType = (ctx.figureType ?? "figure").toLowerCase();
  const descriptionLower = input.description.toLowerCase();
  const available = Array.isArray(input.availableModels) ? input.availableModels : [];

  const chosenModel =
    (ctx.existingModel && available.some((m) => m.id === ctx.existingModel) ? ctx.existingModel : undefined) ??
    AI_VARIANT_MODEL_PREFERENCE.find((id) => available.some((m) => m.id === id)) ??
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

  const response = await getAiml().chatCompletion({
    model: agentModel(),
    temperature: 0.2,
    max_tokens: 700,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "ai_variant_image_prompt",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            model: { type: "string" },
            prompt: { type: "string", minLength: 1 },
            negativePrompt: { type: "string", minLength: 1 },
          },
          required: ["prompt", "negativePrompt"],
        },
      },
    },
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
