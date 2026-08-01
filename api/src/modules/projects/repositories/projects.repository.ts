import { prisma } from "../../../integrations/db/client";
import type { CreateProjectInput, UpdateProjectInput } from "../interfaces/projects.types";

const projectListInclude = {
  _count: { select: { figures: true } },
} as const;

export async function listProjects(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    include: projectListInclude,
    orderBy: { createdAt: "asc" },
  });
}

export async function getProjectById(userId: string, id: string) {
  return prisma.project.findFirst({
    where: { id, userId },
    include: projectListInclude,
  });
}

export async function createProject(userId: string, input: CreateProjectInput) {
  return prisma.project.create({
    data: { userId, name: input.name },
    include: projectListInclude,
  });
}

export async function updateProject(userId: string, id: string, input: UpdateProjectInput) {
  const existing = await prisma.project.findFirst({ where: { id, userId } });
  if (!existing) return null;
  return prisma.project.update({
    where: { id },
    data: { name: input.name },
    include: projectListInclude,
  });
}

export async function deleteProject(userId: string, id: string) {
  const existing = await prisma.project.findFirst({ where: { id, userId } });
  if (!existing) return null;
  if (existing.figureIds.length > 0) {
    await prisma.project.update({
      where: { id },
      data: { figures: { set: [] } },
    });
  }
  await prisma.project.delete({ where: { id } });
  return existing;
}

export async function listProjectFigures(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
  if (!project) return null;

  return prisma.figure.findMany({
    where: { userId, projects: { some: { id: projectId } } },
    include: {
      skins: {
        include: {
          variants: {
            include: {
              images: {
                orderBy: { createdAt: "desc" },
                include: {
                  models: {
                    include: { animations: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { isBase: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function addFigureToProject(userId: string, projectId: string, figureId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!project) return { error: "project_not_found" as const };

  const figure = await prisma.figure.findFirst({ where: { id: figureId, userId } });
  if (!figure) return { error: "figure_not_found" as const };

  if (figure.projectIds.includes(projectId)) {
    return { project: await getProjectById(userId, projectId) };
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { figures: { connect: [{ id: figureId }] } },
    include: projectListInclude,
  });
  return { project: updated };
}

export async function removeFigureFromProject(userId: string, projectId: string, figureId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!project) return { error: "project_not_found" as const };

  const figure = await prisma.figure.findFirst({ where: { id: figureId, userId } });
  if (!figure) return { error: "figure_not_found" as const };

  if (!figure.projectIds.includes(projectId)) {
    return { project: await getProjectById(userId, projectId) };
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { figures: { disconnect: [{ id: figureId }] } },
    include: projectListInclude,
  });
  return { project: updated };
}
