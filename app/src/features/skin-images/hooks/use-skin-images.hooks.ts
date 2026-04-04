import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteSkinImage } from "@/features/skin-images/services/skin-images.services";
import type { DeleteSkinImageParams } from "@/features/skin-images/interfaces/skin-images.interfaces";

export function useDeleteSkinImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: DeleteSkinImageParams) => deleteSkinImage(params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["figures"] }),
  });
}
