import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createVariant,
  updateVariant,
  deleteVariant,
  generateAiPrompt,
  generateImage,
} from "@/features/skin-variants/services/skin-variants.services";
import type {
  CreateSkinVariantParams,
  DeleteSkinVariantParams,
  GenerateAiPromptDto,
  GenerateSkinImageParams,
  UpdateSkinVariantParams,
} from "@/features/skin-variants/interfaces/skin-variants.interfaces";

export function useCreateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ figureId, skinId }: CreateSkinVariantParams) => createVariant(figureId, skinId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["figures"] }),
  });
}

export function useUpdateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ figureId, skinId, variantCode, dto }: UpdateSkinVariantParams) =>
      updateVariant(figureId, skinId, variantCode, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["figures"] }),
  });
}

export function useDeleteVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ figureId, skinId, variantId }: DeleteSkinVariantParams) =>
      deleteVariant(figureId, skinId, variantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["figures"] }),
  });
}

export function useGenerateAiPrompt() {
  return useMutation({
    mutationFn: (dto: GenerateAiPromptDto) => generateAiPrompt(dto),
  });
}

export function useGenerateImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ figureId, skinId, variantCode, dto }: GenerateSkinImageParams) =>
      generateImage(figureId, skinId, variantCode, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["figures"] }),
  });
}
