export interface UpsertVariantInput {
  variant: string; // "A" | "B"
  prompt?: string;
  negativePrompt?: string;
  imageModel?: string;
}

