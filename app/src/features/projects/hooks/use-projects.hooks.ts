import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  addFigureToProject,
  createProject,
  deleteProject,
  getProject,
  listProjectFigures,
  listProjects,
  removeFigureFromProject,
  updateProject,
} from "@/features/projects/services/projects.services";
import type {
  AddFigureToProjectParams,
  CreateProjectDto,
  Project,
  RemoveFigureFromProjectParams,
  UpdateProjectParams,
} from "@/features/projects/interfaces/project.interfaces";
import type { Figure } from "@/interfaces";
import { useAuthStore } from "@/store/authStore";

export function useProjects() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ["projects", userId],
    queryFn: listProjects,
    enabled: !!userId,
  });
}

export function useProject(projectId: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ["projects", userId, projectId],
    queryFn: () => getProject(projectId!),
    enabled: !!userId && !!projectId,
  });
}

export function useProjectFigures(projectId: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ["figures", userId, projectId],
    queryFn: () => listProjectFigures(projectId!),
    enabled: !!userId && !!projectId,
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

export function useCreateProject() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: (dto: CreateProjectDto) => createProject(dto),
    onSuccess: (created) => {
      toast.success("Project created");
      qc.setQueryData<Project[]>(["projects", userId], (old) => {
        if (!old) return [created];
        if (old.some((p) => p.id === created.id)) {
          return old.map((p) => (p.id === created.id ? created : p));
        }
        return [...old, created];
      });
      void qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not create project"),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: UpdateProjectParams) => updateProject(id, dto),
    onSuccess: () => {
      toast.success("Project updated");
      void qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not update project"),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      toast.success("Project deleted");
      void qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not delete project"),
  });
}

export function useAddFigureToProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, figureId }: AddFigureToProjectParams) =>
      addFigureToProject(projectId, figureId),
    onSuccess: () => {
      toast.success("Figure added to project");
      void qc.invalidateQueries({ queryKey: ["projects"] });
      void qc.invalidateQueries({ queryKey: ["figures"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not add figure to project"),
  });
}

export function useRemoveFigureFromProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, figureId }: RemoveFigureFromProjectParams) =>
      removeFigureFromProject(projectId, figureId),
    onSuccess: () => {
      toast.success("Figure removed from project");
      void qc.invalidateQueries({ queryKey: ["projects"] });
      void qc.invalidateQueries({ queryKey: ["figures"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not remove figure from project"),
  });
}
