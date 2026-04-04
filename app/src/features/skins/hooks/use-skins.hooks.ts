import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSkin, updateSkin, deleteSkin } from "@/features/skins/services/skins.services";
import type {
  CreateSkinParams,
  DeleteSkinParams,
  UpdateSkinParams,
} from "@/features/skins/interfaces/skins.interfaces";

export function useCreateSkin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ figureId, name }: CreateSkinParams) => createSkin(figureId, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["figures"] }),
  });
}

export function useUpdateSkin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ figureId, skinId, name }: UpdateSkinParams) => updateSkin(figureId, skinId, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["figures"] }),
  });
}

export function useDeleteSkin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ figureId, skinId }: DeleteSkinParams) => deleteSkin(figureId, skinId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["figures"] }),
  });
}
