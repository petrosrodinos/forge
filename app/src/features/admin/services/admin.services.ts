import { apiFetch } from "@/utils/apiClient";
import type { AdminMetricsDto, AdminUserRowDto } from "@/features/admin/interfaces/admin.interfaces";

export function getAdminMetrics(): Promise<AdminMetricsDto> {
  return apiFetch<AdminMetricsDto>("/api/admin/metrics");
}

export function getAdminUsers(): Promise<AdminUserRowDto[]> {
  return apiFetch<AdminUserRowDto[]>("/api/admin/users");
}
