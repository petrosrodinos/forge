export interface CreateSkinImageInput {
  variantId: string;
  figureId: string;
  sourceUrl: string;
  metadata?: {
    prompt?: string;
    negativePrompt?: string;
    model?: string;
  };
}

