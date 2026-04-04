import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteModel3d } from "@/features/models3d/services/models3d.services";
import type { DeleteModel3dParams } from "@/features/models3d/interfaces/models3d.interfaces";

export function useDeleteModel3d() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: DeleteModel3dParams) => deleteModel3d(params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["figures"] }),
  });
}
