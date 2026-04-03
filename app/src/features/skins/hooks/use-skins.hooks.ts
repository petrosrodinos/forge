import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSkin, updateSkin, deleteSkin } from "@/features/skins/services/skins.services";

export function useCreateSkin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ figureId, name }: { figureId: string; name: string }) =>
      createSkin(figureId, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["figures"] }),
  });
}

export function useUpdateSkin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ figureId, skinId, name }: { figureId: string; skinId: string; name: string }) =>
      updateSkin(figureId, skinId, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["figures"] }),
  });
}

export function useDeleteSkin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ figureId, skinId }: { figureId: string; skinId: string }) =>
      deleteSkin(figureId, skinId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["figures"] }),
  });
}
