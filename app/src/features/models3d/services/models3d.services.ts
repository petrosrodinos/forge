import { apiFetch } from "@/utils/apiClient";
import type { DeleteModel3dParams } from "@/features/models3d/interfaces/models3d.interfaces";

export async function deleteModel3d({ id }: DeleteModel3dParams): Promise<void> {
  return apiFetch<void>(`/api/models3d/${id}`, { method: "DELETE" });
}
