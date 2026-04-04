/** Context forwarded to POST /api/figures/ai-variant */
export interface GenerateAiPromptContext {
  figureName?: string;
  figureType?: string;
  skinName?: string;
  existingModel?: string | null;
  existingPrompt?: string | null;
  existingNegPrompt?: string | null;
  otherVariantPrompt?: string | null;
}

export interface AimlModelOption {
  id: string;
  label: string;
}

export interface GenerateAiPromptDto {
  description: string;
  /** Saved display name when set; otherwise a stable fallback such as "Variant A" */
  variant: string;
  availableModels: AimlModelOption[];
  context?: GenerateAiPromptContext;
}

export interface GenerateAiPromptResponse {
  prompt: string;
  negativePrompt?: string;
  model?: string;
}

export interface UpdateSkinVariantDto {
  name?: string | null;
  prompt?: string;
  negativePrompt?: string;
  imageModel?: string;
}

export interface GenerateSkinImageDto {
  prompt: string;
  negativePrompt?: string;
  model?: string;
  /** Base64 data URL (`data:image/...;base64,...`) for image-to-image models */
  sourceImageDataUrl?: string;
}

export interface GenerateSkinImageResponse {
  imageUrl: string;
  skinImageId: string;
}

export interface CreateSkinVariantParams {
  figureId: string;
  skinId: string;
}

export interface UpdateSkinVariantParams {
  figureId: string;
  skinId: string;
  variantCode: string;
  dto: UpdateSkinVariantDto;
}

export interface DeleteSkinVariantParams {
  figureId: string;
  skinId: string;
  variantId: string;
}

export interface GenerateSkinImageParams {
  figureId: string;
  skinId: string;
  variantCode: string;
  dto: GenerateSkinImageDto;
}
