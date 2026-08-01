import { apiFetch, jsonInit } from "@/utils/apiClient";
import type { Figure } from "@/interfaces";
import type {
  CreateProjectDto,
  Project,
  UpdateProjectDto,
} from "@/features/projects/interfaces/project.interfaces";

function rethrow(e: unknown): never {
  throw e instanceof Error ? e : new Error(String(e));
}

export async function listProjects(): Promise<Project[]> {
  try {
    return await apiFetch<Project[]>("/api/projects");
  } catch (e) {
    rethrow(e);
  }
}

export async function getProject(id: string): Promise<Project> {
  try {
    return await apiFetch<Project>(`/api/projects/${id}`);
  } catch (e) {
    rethrow(e);
  }
}

export async function createProject(dto: CreateProjectDto): Promise<Project> {
  try {
    return await apiFetch<Project>("/api/projects", { method: "POST", ...jsonInit(dto) });
  } catch (e) {
    rethrow(e);
  }
}

export async function updateProject(id: string, dto: UpdateProjectDto): Promise<Project> {
  try {
    return await apiFetch<Project>(`/api/projects/${id}`, { method: "PUT", ...jsonInit(dto) });
  } catch (e) {
    rethrow(e);
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    return await apiFetch<void>(`/api/projects/${id}`, { method: "DELETE" });
  } catch (e) {
    rethrow(e);
  }
}

export async function listProjectFigures(projectId: string): Promise<Figure[]> {
  try {
    return await apiFetch<Figure[]>(`/api/projects/${projectId}/figures`);
  } catch (e) {
    rethrow(e);
  }
}

export async function addFigureToProject(projectId: string, figureId: string): Promise<Project> {
  try {
    return await apiFetch<Project>(`/api/projects/${projectId}/figures`, {
      method: "POST",
      ...jsonInit({ figureId }),
    });
  } catch (e) {
    rethrow(e);
  }
}

export async function removeFigureFromProject(projectId: string, figureId: string): Promise<Project> {
  try {
    return await apiFetch<Project>(`/api/projects/${projectId}/figures/${figureId}`, {
      method: "DELETE",
    });
  } catch (e) {
    rethrow(e);
  }
}
