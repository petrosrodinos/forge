import { apiFetch, jsonInit } from "@/utils/apiClient";
import type { Skin } from "@/interfaces";

export async function createSkin(figureId: string, dto: { name: string }): Promise<Skin> {
  return apiFetch<Skin>(`/api/figures/${figureId}/skins`, { method: "POST", ...jsonInit(dto) });
}

export async function updateSkin(figureId: string, skinId: string, dto: { name: string }): Promise<Skin> {
  return apiFetch<Skin>(`/api/figures/${figureId}/skins/${skinId}`, { method: "PUT", ...jsonInit(dto) });
}

export async function deleteSkin(figureId: string, skinId: string): Promise<void> {
  return apiFetch<void>(`/api/figures/${figureId}/skins/${skinId}`, { method: "DELETE" });
}
