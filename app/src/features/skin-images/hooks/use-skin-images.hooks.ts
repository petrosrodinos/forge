import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteSkinImage } from "@/features/skin-images/services/skin-images.services";

export function useDeleteSkinImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      figureId,
      skinId,
      variantId,
      imageId,
    }: {
      figureId: string;
      skinId: string;
      variantId: string;
      imageId: string;
    }) => deleteSkinImage(figureId, skinId, variantId, imageId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["figures"] }),
  });
}
