import { apiFetch } from "@/utils/apiClient";

export async function deleteSkinImage(
  figureId: string,
  skinId: string,
  variantId: string,
  imageId: string,
): Promise<void> {
  return apiFetch<void>(
    `/api/figures/${figureId}/skins/${skinId}/variants/${variantId}/images/${imageId}`,
    { method: "DELETE" },
  );
}
