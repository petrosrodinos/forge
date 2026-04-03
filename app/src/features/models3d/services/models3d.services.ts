import { apiFetch } from "@/utils/apiClient";

export async function deleteModel3d(id: string): Promise<void> {
  return apiFetch<void>(`/api/models3d/${id}`, { method: "DELETE" });
}
