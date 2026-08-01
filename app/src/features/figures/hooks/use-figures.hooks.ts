import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createFigure,
  deleteFigure,
  listFigures,
  updateFigure,
} from "@/features/figures/services/figures.services";
import type { CreateFigureDto, UpdateFigureParams } from "@/features/figures/interfaces/figure.interfaces";
import type { Figure } from "@/interfaces";
import { useAuthStore } from "@/store/authStore";

export function useFigures() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ["figures", userId],
    queryFn: listFigures,
    enabled: !!userId,
    refetchInterval: (query) => {
      const figures = query.state.data as Figure[] | undefined;
      if (!figures || figures.length === 0) return false;
      const hasActiveJobs = figures.some((f) =>
        f.skins.some((s) =>
          s.variants.some((v) =>
            v.images.some((img) =>
              img.models.some(
                (m) =>
                  m.status === "pending" ||
                  m.status === "processing" ||
                  m.animations.some((a) => a.status === "pending" || a.status === "processing"),
              ),
            ),
          ),
        ),
      );
      return hasActiveJobs ? 2000 : false;
    },
  });
}

export function useCreateFigure() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: (dto: CreateFigureDto) => createFigure(dto),
    onSuccess: (created, dto) => {
      toast.success("Figure created");
      qc.setQueryData<Figure[]>(["figures", userId], (old) => {
        if (!old) return [created];
        if (old.some((f) => f.id === created.id)) {
          return old.map((f) => (f.id === created.id ? created : f));
        }
        return [created, ...old];
      });
      if (dto.projectId) {
        qc.setQueryData<Figure[]>(["figures", userId, dto.projectId], (old) => {
          if (!old) return [created];
          if (old.some((f) => f.id === created.id)) {
            return old.map((f) => (f.id === created.id ? created : f));
          }
          return [created, ...old];
        });
        void qc.invalidateQueries({ queryKey: ["projects"] });
      }
      void qc.invalidateQueries({ queryKey: ["figures"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not create figure"),
  });
}

export function useUpdateFigure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: UpdateFigureParams) => updateFigure(id, dto),
    onSuccess: () => {
      toast.success("Figure updated");
      void qc.invalidateQueries({ queryKey: ["figures"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not update figure"),
  });
}

export function useDeleteFigure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFigure(id),
    onSuccess: () => {
      toast.success("Figure deleted");
      void qc.invalidateQueries({ queryKey: ["figures"] });
      void qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not delete figure"),
  });
}
