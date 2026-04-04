import { deleteGcsFiles } from "../../integrations/gcs/gcs.service";
import { collectGcsKeysFromVariant } from "../../integrations/gcs/collectGcsAssetKeys";
import type { CreateVariantInput, UpsertVariantInput } from "./interfaces/skin-variants.types";
import {
  getVariant as getVariantRepo,
  upsertVariant as upsertVariantRepo,
  createVariant as createVariantRepo,
  deleteVariantById as deleteVariantByIdRepo,
  findVariantWithGcsAssets,
} from "./repositories/skin-variants.repository";
import { getAiml } from "../../services";
import * as skinImageSvc from "../skin-images/skin-images.service";
import { IMAGES_CONFIG } from "../images/config/images.config";
import { ImageModels } from "../../config/models/image-models";
import { buildAimlImageGenerationsBody } from "../../integrations/aimlapi/buildImageGenerationsBody";

const MAX_SOURCE_IMAGE_DATA_URL_LENGTH = 12 * 1024 * 1024;

function imageModelRequiresSourceImage(modelId: string): boolean {
  return Boolean(ImageModels.find((m) => m.id === modelId)?.is_image_to_image);
}

function assertValidSourceImageDataUrl(dataUrl: string) {
  if (!dataUrl.startsWith("data:image/") || !dataUrl.includes(";base64,")) {
    throw new Error("sourceImageDataUrl must be a base64 data URL for an image");
  }
  if (dataUrl.length > MAX_SOURCE_IMAGE_DATA_URL_LENGTH) {
    throw new Error("Source image is too large");
  }
}

export async function upsertVariant(skinId: string, input: UpsertVariantInput) {
  return upsertVariantRepo(skinId, input);
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
  skinId: string,
  variant: string,
  figureId: string,
  overrides: {
    prompt?: string;
    model?: string;
    negativePrompt?: string;
    sourceImageDataUrl?: string;
  } = {},
) {
  const v = await getVariantRepo(skinId, variant);
  if (!v) throw new Error("Variant not found");

  const model = (overrides.model ?? v.imageModel ?? IMAGES_CONFIG.DEFAULT_AIML_IMAGE_MODEL).trim();
  const prompt = (overrides.prompt ?? v.prompt ?? "").trim();
  const neg = (overrides.negativePrompt ?? v.negativePrompt ?? "").trim();
  const sourceTrimmed = overrides.sourceImageDataUrl?.trim();

  if (!prompt) throw new Error("Prompt is required to generate an image");

  const needsSource = imageModelRequiresSourceImage(model);
  if (needsSource) {
    if (!sourceTrimmed) throw new Error("This image model requires a source image");
    assertValidSourceImageDataUrl(sourceTrimmed);
  }

  const finalPrompt = neg ? `${prompt}\n\nNegative prompt: ${neg}` : prompt;
  const generated = await getAiml().generateImage(
    sourceTrimmed
      ? buildAimlImageGenerationsBody({
          internalModelId: model,
          prompt,
          negativePrompt: neg,
          sourceImageDataUrl: sourceTrimmed,
        })
      : { model, prompt: finalPrompt },
  );

  const first = generated.data?.[0];
  const imageUrl =
    first?.url ??
    (first?.b64_json ? `data:image/png;base64,${first.b64_json}` : null);

  if (!imageUrl) throw new Error("No image returned from generation");

  const savedImage = await skinImageSvc.createSkinImage(v.id, figureId, imageUrl);
  return { imageUrl, skinImageId: savedImage.id };
}
