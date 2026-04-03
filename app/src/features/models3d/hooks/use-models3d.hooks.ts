import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteModel3d } from "@/features/models3d/services/models3d.services";

export function useDeleteModel3d() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteModel3d(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["figures"] }),
  });
}
