import type { CreateProjectInput, UpdateProjectInput } from "./interfaces/projects.types";
import * as projectsRepo from "./repositories/projects.repository";

export async function listProjects(userId: string) {
  return projectsRepo.listProjects(userId);
}

export async function getProjectById(userId: string, id: string) {
  return projectsRepo.getProjectById(userId, id);
}

export async function createProject(userId: string, input: CreateProjectInput) {
  return projectsRepo.createProject(userId, input);
}

export async function updateProject(userId: string, id: string, input: UpdateProjectInput) {
  return projectsRepo.updateProject(userId, id, input);
}

export async function deleteProject(userId: string, id: string) {
  return projectsRepo.deleteProject(userId, id);
}

export async function listProjectFigures(userId: string, projectId: string) {
  return projectsRepo.listProjectFigures(userId, projectId);
}

export async function addFigureToProject(userId: string, projectId: string, figureId: string) {
  return projectsRepo.addFigureToProject(userId, projectId, figureId);
}

export async function removeFigureFromProject(userId: string, projectId: string, figureId: string) {
  return projectsRepo.removeFigureFromProject(userId, projectId, figureId);
}
