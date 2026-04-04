import { apiFetch, jsonInit } from "@/utils/apiClient";
import type { SkinVariant } from "@/interfaces";
import type {
  GenerateAiPromptDto,
  GenerateAiPromptResponse,
  GenerateSkinImageDto,
  GenerateSkinImageResponse,
  UpdateSkinVariantDto,
} from "@/features/skin-variants/interfaces/skin-variants.interfaces";

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
  dto: UpdateSkinVariantDto,
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

export async function generateAiPrompt(dto: GenerateAiPromptDto): Promise<GenerateAiPromptResponse> {
  return apiFetch("/api/figures/ai-variant", { method: "POST", ...jsonInit(dto) });
}

export async function generateImage(
  figureId: string,
  skinId: string,
  variantCode: string,
  dto: GenerateSkinImageDto,
): Promise<GenerateSkinImageResponse> {
  return apiFetch(`/api/figures/${figureId}/skins/${skinId}/variants/${variantCode}/generate-image`, {
    method: "POST",
    ...jsonInit(dto),
  });
}
