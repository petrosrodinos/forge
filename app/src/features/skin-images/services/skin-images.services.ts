import { apiFetch } from "@/utils/apiClient";
import type { DeleteSkinImageParams } from "@/features/skin-images/interfaces/skin-images.interfaces";

export async function deleteSkinImage({
  figureId,
  skinId,
  variantId,
  imageId,
}: DeleteSkinImageParams): Promise<void> {
  return apiFetch<void>(
    `/api/figures/${figureId}/skins/${skinId}/variants/${variantId}/images/${imageId}`,
    { method: "DELETE" },
  );
}
