import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFigure,
  deleteFigure,
  listFigures,
  updateFigure,
} from "@/features/figures/services/figures.services";
import type { CreateFigureDto, UpdateFigureDto } from "@/features/figures/interfaces/figure.interfaces";

export function useFigures() {
  return useQuery({ queryKey: ["figures"], queryFn: listFigures });
}

export function useCreateFigure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateFigureDto) => createFigure(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["figures"] }),
  });
}

export function useUpdateFigure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateFigureDto }) =>
      updateFigure(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["figures"] }),
  });
}

export function useDeleteFigure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFigure(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["figures"] }),
  });
}
