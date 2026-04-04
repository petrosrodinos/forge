import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createVariant,
  updateVariant,
  deleteVariant,
  generateAiPrompt,
  generateImage,
  type GenerateAiPromptContext,
} from "@/features/skin-variants/services/skin-variants.services";

export function useCreateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ figureId, skinId }: { figureId: string; skinId: string }) =>
      createVariant(figureId, skinId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["figures"] }),
  });
}

export function useUpdateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      figureId,
      skinId,
      variantCode,
      dto,
    }: {
      figureId: string;
      skinId: string;
      variantCode: string;
      dto: { name?: string | null; prompt?: string; negativePrompt?: string; imageModel?: string };
    }) => updateVariant(figureId, skinId, variantCode, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["figures"] }),
  });
}

export function useDeleteVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ figureId, skinId, variantId }: { figureId: string; skinId: string; variantId: string }) =>
      deleteVariant(figureId, skinId, variantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["figures"] }),
  });
}

export function useGenerateAiPrompt() {
  return useMutation({
    mutationFn: (dto: {
      description: string;
      variant: string;
      availableModels: { id: string; label: string }[];
      context?: GenerateAiPromptContext;
    }) => generateAiPrompt(dto),
  });
}

export function useGenerateImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      figureId,
      skinId,
      variantCode,
      dto,
    }: {
      figureId: string;
      skinId: string;
      variantCode: string;
      dto: { prompt: string; negativePrompt?: string; model?: string };
    }) => generateImage(figureId, skinId, variantCode, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["figures"] }),
  });
}
