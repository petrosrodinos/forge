import { apiFetch, jsonInit } from "@/utils/apiClient";
import type { SkinVariant } from "@/interfaces";

export async function createVariant(figureId: string, skinId: string): Promise<SkinVariant> {
  return apiFetch<SkinVariant>(`/api/figures/${figureId}/skins/${skinId}/variants`, {
    method: "POST",
    ...jsonInit({}),
  });
}

export async function updateVariant(
  figureId: string,
  skinId: string,
  variantCode: string,
  dto: { name?: string | null; prompt?: string; negativePrompt?: string; imageModel?: string },
): Promise<SkinVariant> {
  return apiFetch<SkinVariant>(`/api/figures/${figureId}/skins/${skinId}/variants/${variantCode}`, {
    method: "PUT",
    ...jsonInit(dto),
  });
}

export async function deleteVariant(figureId: string, skinId: string, variantId: string): Promise<void> {
  return apiFetch<void>(`/api/figures/${figureId}/skins/${skinId}/variants/by-id/${variantId}`, {
    method: "DELETE",
  });
}

export type GenerateAiPromptContext = {
  figureName?: string;
  figureType?: string;
  skinName?: string;
  existingModel?: string | null;
  existingPrompt?: string | null;
  existingNegPrompt?: string | null;
  otherVariantPrompt?: string | null;
};

export async function generateAiPrompt(dto: {
  description: string;
  variant: string;
  availableModels: { id: string; label: string }[];
  context?: GenerateAiPromptContext;
}): Promise<{ prompt: string; negativePrompt?: string; model?: string }> {
  return apiFetch("/api/figures/ai-variant", { method: "POST", ...jsonInit(dto) });
}

export async function generateImage(
  figureId: string,
  skinId: string,
  variantCode: string,
  dto: { prompt: string; negativePrompt?: string; model?: string },
): Promise<{ imageUrl: string; skinImageId: string }> {
  return apiFetch(`/api/figures/${figureId}/skins/${skinId}/variants/${variantCode}/generate-image`, {
    method: "POST",
    ...jsonInit(dto),
  });
}
