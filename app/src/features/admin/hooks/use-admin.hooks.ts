import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteAdminUser, getAdminMetrics, getAdminUsers } from "@/features/admin/services/admin.services";

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

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "metrics"] });
    },
  });
}
