import { deleteGcsFiles } from "../../integrations/gcs/gcs.service";
import { collectGcsKeysFromVariant } from "../../integrations/gcs/collectGcsAssetKeys";
import type { CreateVariantInput, UpdateVariantByIdInput, UpsertVariantInput } from "./interfaces/skin-variants.types";
import {
  getVariant as getVariantRepo,
  upsertVariant as upsertVariantRepo,
  createVariant as createVariantRepo,
  deleteVariantById as deleteVariantByIdRepo,
  findVariantWithGcsAssets,
  updateVariantById as updateVariantByIdRepo,
} from "./repositories/skin-variants.repository";
import { getAiml } from "../../services";
import * as skinImageSvc from "../skin-images/skin-images.service";
import { IMAGES_CONFIG } from "../images/config/images.config";
import { usageMetadataWithProviderCosts } from "../../lib/provider-costs-metadata";
import {
  assertUserHasTokenBalance,
  debitForImageModel,
  getDebitTokensForImageModel,
} from "../tokens/tokens.service";
import { canonicalImageModelId, ImageModels } from "../../config/models/image-models";
import { buildAimlImageGenerationsBody } from "../../integrations/aimlapi/buildImageGenerationsBody";
import { buildSketchTo3dPrompts } from "../../config/ai-prompts/figures/sketchToImage.prompts";
import { Jimp } from "jimp";

const MAX_SOURCE_IMAGE_DATA_URL_LENGTH = 12 * 1024 * 1024;
const SOURCE_IMAGE_UPSCALE_PRESETS = ["64x64", "128x128", "256x256", "512x512"] as const;
type SourceImageUpscalePreset = (typeof SOURCE_IMAGE_UPSCALE_PRESETS)[number];

/** Default img2img model when sketch mode is used and the variant has no i2i model selected */
const SKETCH_DEFAULT_I2I_MODEL = "flux-2-max-edit";
const AIML_IMAGE_GENERATION_MAX_ATTEMPTS = 2;

function isRetryableAimlImageError(err: unknown): boolean {
  const maybe = err as { message?: string; upstreamStatus?: number; status?: number; code?: string } | undefined;
  const msg = String(maybe?.message ?? "").toLowerCase();
  const upstreamStatus = Number(maybe?.upstreamStatus ?? 0);
  const status = Number(maybe?.status ?? 0);
  const code = String(maybe?.code ?? "").toUpperCase();
  if (msg.includes("stream has been aborted")) return true;
  if (msg.includes("timeout")) return true;
  if (code === "ECONNABORTED" || code === "ECONNRESET" || code === "ETIMEDOUT") return true;
  if (upstreamStatus === 0) return true;
  return upstreamStatus === 502 || upstreamStatus === 503 || upstreamStatus === 504 || status === 503;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function imageModelRequiresSourceImage(modelId: string): boolean {
  return Boolean(ImageModels.find((m) => m.id === canonicalImageModelId(modelId))?.is_image_to_image);
}

function resolveSketchImageModel(overrideModel: string | undefined, variantModel: string | undefined): string {
  const candidate = canonicalImageModelId((overrideModel ?? variantModel ?? "").trim());
  if (candidate && imageModelRequiresSourceImage(candidate)) return candidate;
  return canonicalImageModelId(SKETCH_DEFAULT_I2I_MODEL);
}

function assertValidSourceImageDataUrl(dataUrl: string) {
  if (!dataUrl.startsWith("data:image/") || !dataUrl.includes(";base64,")) {
    throw new Error("sourceImageDataUrl must be a base64 data URL for an image");
  }
  if (dataUrl.length > MAX_SOURCE_IMAGE_DATA_URL_LENGTH) {
    throw new Error("Source image is too large");
  }
}

function parseSourceImageUpscalePreset(value: string | undefined): SourceImageUpscalePreset | undefined {
  if (!value) return undefined;
  const preset = value.trim();
  if (SOURCE_IMAGE_UPSCALE_PRESETS.includes(preset as SourceImageUpscalePreset)) {
    return preset as SourceImageUpscalePreset;
  }
  throw new Error(`Invalid upscalePreset: ${preset}`);
}

async function upscaleSourceImageDataUrl(dataUrl: string, preset: SourceImageUpscalePreset): Promise<string> {
  const m = /^data:(image\/[^;]+);base64,(.+)$/is.exec(dataUrl.trim());
  if (!m) throw new Error("sourceImageDataUrl must be a base64 data URL for an image");
  const mime = m[1]!;
  const rawB64 = m[2]!.replace(/\s+/g, "");
  const [w, h] = preset.split("x").map((n) => Number(n));
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    throw new Error("Invalid upscale preset");
  }

  const inputBuffer = Buffer.from(rawB64, "base64");
  const image = await Jimp.read(inputBuffer);
  image.resize({ w, h });

  const outputBuffer = await image.getBuffer("image/png");
  return `data:${mime.toLowerCase()};base64,${outputBuffer.toString("base64")}`;
}

export async function upsertVariant(skinId: string, input: UpsertVariantInput) {
  return upsertVariantRepo(skinId, input);
}

export async function updateVariantById(skinId: string, variantId: string, input: UpdateVariantByIdInput) {
  return updateVariantByIdRepo(skinId, variantId, input);
}

export async function getVariant(skinId: string, variant: string) {
  return getVariantRepo(skinId, variant);
}

export async function createVariant(skinId: string, input: CreateVariantInput) {
  return createVariantRepo(skinId, input);
}

export async function deleteVariantById(id: string) {
  const existing = await findVariantWithGcsAssets(id);
  if (existing) await deleteGcsFiles(collectGcsKeysFromVariant(existing));
  return deleteVariantByIdRepo(id);
}

export async function generateImageForVariant(
  userId: string,
  skinId: string,
  variant: string,
  figureId: string,
  overrides: {
    prompt?: string;
    model?: string;
    negativePrompt?: string;
    sourceImageDataUrl?: string;
    upscalePreset?: string;
    /** When true, prompt/negativePrompt are built for mesh-ready img2i from the sketch */
    fromSketch?: boolean;
    sketchHint?: string;
    figureType?: string;
  } = {},
) {
  const v = await getVariantRepo(skinId, variant);
  if (!v) throw new Error("Variant not found");

  const sourceTrimmed = overrides.sourceImageDataUrl?.trim();
  const upscalePreset = parseSourceImageUpscalePreset(overrides.upscalePreset);
  let processedSourceImageDataUrl = sourceTrimmed;
  const fromSketch = Boolean(overrides.fromSketch);

  let model: string;
  let prompt: string;
  let neg: string;

  if (fromSketch) {
    if (!processedSourceImageDataUrl) throw new Error("Sketch mode requires sourceImageDataUrl");
    assertValidSourceImageDataUrl(processedSourceImageDataUrl);
    if (upscalePreset) {
      processedSourceImageDataUrl = await upscaleSourceImageDataUrl(processedSourceImageDataUrl, upscalePreset);
    }
    model = resolveSketchImageModel(overrides.model, v.imageModel ?? undefined);
    const built = buildSketchTo3dPrompts({
      figureType: overrides.figureType,
      sketchHint: overrides.sketchHint,
    });
    prompt = built.prompt;
    neg = built.negativePrompt;
  } else {
    model = canonicalImageModelId(
      (overrides.model ?? v.imageModel ?? IMAGES_CONFIG.DEFAULT_AIML_IMAGE_MODEL).trim(),
    );
    prompt = (overrides.prompt ?? v.prompt ?? "").trim();
    neg = (overrides.negativePrompt ?? v.negativePrompt ?? "").trim();

    if (!prompt) throw new Error("Prompt is required to generate an image");

    const needsSource = imageModelRequiresSourceImage(model);
    if (needsSource) {
      if (!processedSourceImageDataUrl) throw new Error("This image model requires a source image");
      assertValidSourceImageDataUrl(processedSourceImageDataUrl);
      if (upscalePreset) {
        processedSourceImageDataUrl = await upscaleSourceImageDataUrl(processedSourceImageDataUrl, upscalePreset);
      }
    }
  }

  const finalPrompt = neg ? `${prompt}\n\nNegative prompt: ${neg}` : prompt;

  await assertUserHasTokenBalance(userId, getDebitTokensForImageModel(model));

  const aimlBody = processedSourceImageDataUrl
    ? buildAimlImageGenerationsBody({
        internalModelId: model,
        prompt,
        negativePrompt: neg,
        sourceImageDataUrl: processedSourceImageDataUrl,
      })
    : { model, prompt: finalPrompt };

  let generated: Awaited<ReturnType<ReturnType<typeof getAiml>["generateImage"]>>["data"] | null = null;
  let costsMetadata: Awaited<ReturnType<ReturnType<typeof getAiml>["generateImage"]>>["costsMetadata"] | null = null;
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= AIML_IMAGE_GENERATION_MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await getAiml().generateImage(aimlBody);
      generated = result.data;
      costsMetadata = result.costsMetadata;
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      const canRetry = attempt < AIML_IMAGE_GENERATION_MAX_ATTEMPTS && isRetryableAimlImageError(err);
      if (!canRetry) break;
      await sleep(800);
    }
  }

  if (lastErr || !generated || !costsMetadata) {
    throw lastErr instanceof Error ? lastErr : new Error("Image generation failed");
  }

  const first = generated.data?.[0];
  const imageUrl =
    first?.url ??
    (first?.b64_json ? `data:image/png;base64,${first.b64_json}` : null);

  if (!imageUrl) throw new Error("No image returned from generation");

  await debitForImageModel(
    userId,
    model,
    undefined,
    usageMetadataWithProviderCosts(costsMetadata, "aimlapi"),
  );

  const savedImage = await skinImageSvc.createSkinImage(v.id, figureId, imageUrl, {
    prompt,
    negativePrompt: neg || undefined,
    model,
  });
  return { imageUrl, skinImageId: savedImage.id };
}
