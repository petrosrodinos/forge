import { z } from "zod";

export const projectIdParamSchema = z.object({
  id: z.string().min(1),
});

export const projectFigureParamsSchema = z.object({
  id: z.string().min(1),
  figureId: z.string().min(1),
});

export const createProjectBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const updateProjectBodySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
}).refine((data) => data.name !== undefined, {
  message: "At least one field is required",
});

export const addFigureToProjectBodySchema = z.object({
  figureId: z.string().min(1),
});
