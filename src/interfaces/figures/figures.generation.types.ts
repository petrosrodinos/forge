export interface GenerateFigureImageInput {
  figureId: string;
  skinName?: string | null;
  variant: "A" | "B";
  model?: string;
  prompt: string;
  negativePrompt?: string;
  size?: string;
  steps?: number;
}

export interface AiVariantContext {
  figureName?: string;
  figureType?: string; // e.g. "figure" | "obstacle"
  skinName?: string;
  existingModel?: string | null;
  existingPrompt?: string | null;
  existingNegPrompt?: string | null;
  otherVariantPrompt?: string | null;
}

export interface GenerateAiVariantInput {
  description: string;
  variant: "A" | "B";
  context?: AiVariantContext;
  availableModels?: Array<{ id: string; label?: string }>;
}

