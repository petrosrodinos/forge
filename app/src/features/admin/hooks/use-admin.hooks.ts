import { useQuery } from "@tanstack/react-query";
import { getAdminMetrics, getAdminUsers } from "@/features/admin/services/admin.services";

export function useAdminMetrics(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "metrics"],
    queryFn: getAdminMetrics,
    enabled,
  });
}

export function useAdminUsers(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: getAdminUsers,
    enabled,
  });
}
