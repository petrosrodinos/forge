import { apiFetch, jsonInit } from "@/utils/apiClient";
import type {
  AdminMetricsDto,
  AdminUserRowDto,
  AdminUserUpdateInput,
} from "@/features/admin/interfaces/admin.interfaces";

export function getAdminMetrics(): Promise<AdminMetricsDto> {
  return apiFetch<AdminMetricsDto>("/api/admin/metrics");
}

export function getAdminUsers(): Promise<AdminUserRowDto[]> {
  return apiFetch<AdminUserRowDto[]>("/api/admin/users");
}

export function deleteAdminUser(userId: string): Promise<void> {
  return apiFetch<void>(`/api/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
}

export function updateAdminUser(userId: string, body: AdminUserUpdateInput): Promise<AdminUserRowDto> {
  return apiFetch<AdminUserRowDto>(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    ...jsonInit(body),
  });
}
