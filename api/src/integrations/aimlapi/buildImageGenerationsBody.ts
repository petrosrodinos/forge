/**
 * AIML `/v1/images/generations` body from `ImageModels[].aiml_api` in `image-models.ts`.
 */

import { ImageModels } from "../../config/models/image-models";

/** AIML Qwen docs: base64 content uses a lowercase `data:image/...;base64,...` prefix. */
function normalizeDataImageBase64Url(dataUrl: string): string {
  const m = /^data:(image\/[^;]+);base64,(.+)$/is.exec(dataUrl.trim());
  if (!m) return dataUrl.trim();
  const mime = m[1]!.toLowerCase();
  const b64 = m[2]!.replace(/\s+/g, "");
  return `data:${mime};base64,${b64}`;
}

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

function mergePromptWithNegative(prompt: string, negativePrompt: string): string {
  const neg = negativePrompt.trim();
  if (!neg) return prompt;
  return `${prompt}\n\nNegative prompt: ${neg}`;
}

export type AimlImageGenerationsBodyInput = {
  /** Must match `ImageModels[].id` */
  internalModelId: string;
  prompt: string;
  negativePrompt?: string;
  /** Data URL or http(s) URL */
  sourceImageDataUrl: string;
};

/**
 * Build JSON body for POST /v1/images/generations.
 */
export function buildAimlImageGenerationsBody(input: AimlImageGenerationsBodyInput): Record<string, unknown> {
  const id = input.internalModelId.trim();
  const cfg = ImageModels.find((m) => m.id === id);
  const aimlModelId = cfg?.aiml_api?.modelId ?? id;
  const i2i = cfg?.aiml_api?.i2i;

  const src = input.sourceImageDataUrl;
  const neg = (input.negativePrompt ?? "").trim();
  const merged = mergePromptWithNegative(input.prompt, input.negativePrompt ?? "");
  const srcVal = isHttpUrl(src) ? src.trim() : normalizeDataImageBase64Url(src);

  if (i2i?.negativeStyle === "negative_prompt_field") {
    const body: Record<string, unknown> = {
      model: aimlModelId,
      prompt: input.prompt.slice(0, i2i.promptMax ?? 800),
      image: srcVal,
    };
    if (neg) body.negative_prompt = neg.slice(0, i2i.negativeMax ?? 500);
    return body;
  }

  const mergedMax = i2i?.mergedPromptMax;
  const promptOut = mergedMax != null ? merged.slice(0, mergedMax) : merged;
  const sourceKey = i2i?.sourceKey ?? "image_url";

  if (sourceKey === "image") {
    return { model: aimlModelId, prompt: promptOut, image: srcVal };
  }
  if (sourceKey === "image_urls") {
    return { model: aimlModelId, prompt: promptOut, image_urls: [srcVal] };
  }
  return { model: aimlModelId, prompt: promptOut, image_url: srcVal };
}
