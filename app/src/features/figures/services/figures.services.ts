import { apiFetch, jsonInit } from "@/utils/apiClient";
import type { Figure } from "@/interfaces";
import type {
  CreateFigureDto,
  GenerateAiVariantDto,
  GenerateAiVariantResponse,
  UpdateFigureDto,
} from "@/features/figures/interfaces/figure.interfaces";

function rethrow(e: unknown): never {
  throw e instanceof Error ? e : new Error(String(e));
}

export async function listFigures(): Promise<Figure[]> {
  try {
    return await apiFetch<Figure[]>("/api/figures");
  } catch (e) {
    rethrow(e);
  }
}

export async function createFigure(b: CreateFigureDto): Promise<Figure> {
  try {
    return await apiFetch<Figure>("/api/figures", { method: "POST", ...jsonInit(b) });
  } catch (e) {
    rethrow(e);
  }
}

export async function updateFigure(id: string, b: UpdateFigureDto): Promise<Figure> {
  try {
    return await apiFetch<Figure>(`/api/figures/${id}`, { method: "PUT", ...jsonInit(b) });
  } catch (e) {
    rethrow(e);
  }
}

export async function deleteFigure(id: string): Promise<void> {
  try {
    return await apiFetch<void>(`/api/figures/${id}`, { method: "DELETE" });
  } catch (e) {
    rethrow(e);
  }
}

export async function generateAiVariant(body: GenerateAiVariantDto): Promise<GenerateAiVariantResponse> {
  try {
    return await apiFetch("/api/figures/ai-variant", { method: "POST", ...jsonInit(body) });
  } catch (e) {
    rethrow(e);
  }
}
