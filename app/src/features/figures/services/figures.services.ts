import { apiFetch, jsonInit } from "@/utils/apiClient";
import type { Figure } from "@/interfaces";
import type { CreateFigureDto, UpdateFigureDto } from "@/features/figures/interfaces/figure.interfaces";

export const listFigures = (): Promise<Figure[]> =>
  apiFetch<Figure[]>("/api/figures");

export const createFigure = (b: CreateFigureDto): Promise<Figure> =>
  apiFetch<Figure>("/api/figures", { method: "POST", ...jsonInit(b) });

export const updateFigure = (id: string, b: UpdateFigureDto): Promise<Figure> =>
  apiFetch<Figure>(`/api/figures/${id}`, { method: "PUT", ...jsonInit(b) });

export const deleteFigure = (id: string): Promise<void> =>
  apiFetch<void>(`/api/figures/${id}`, { method: "DELETE" });

export const generateAiVariant = (body: {
  figureId: string;
  prompt?: string;
}): Promise<{ prompt: string }> =>
  apiFetch("/api/figures/ai-variant", { method: "POST", ...jsonInit(body) });
