import { Router } from "express";
import * as projectsSvc from "./projects.service";
import {
  addFigureToProjectBodySchema,
  createProjectBodySchema,
  projectFigureParamsSchema,
  projectIdParamSchema,
  updateProjectBodySchema,
} from "./projects.schemas";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    res.json(await projectsSvc.listProjects(req.userId));
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const parsed = createProjectBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }
    res.status(201).json(await projectsSvc.createProject(req.userId, parsed.data));
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const params = projectIdParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ error: "Invalid params", details: params.error.flatten() });
    }
    const project = await projectsSvc.getProjectById(req.userId, params.data.id);
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const params = projectIdParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ error: "Invalid params", details: params.error.flatten() });
    }
    const body = updateProjectBodySchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ error: "Invalid body", details: body.error.flatten() });
    }
    const project = await projectsSvc.updateProject(req.userId, params.data.id, body.data);
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const params = projectIdParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ error: "Invalid params", details: params.error.flatten() });
    }
    const project = await projectsSvc.deleteProject(req.userId, params.data.id);
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/figures", async (req, res, next) => {
  try {
    const params = projectIdParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ error: "Invalid params", details: params.error.flatten() });
    }
    const figures = await projectsSvc.listProjectFigures(req.userId, params.data.id);
    if (!figures) return res.status(404).json({ error: "Project not found" });
    res.json(figures);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/figures", async (req, res, next) => {
  try {
    const params = projectIdParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ error: "Invalid params", details: params.error.flatten() });
    }
    const body = addFigureToProjectBodySchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ error: "Invalid body", details: body.error.flatten() });
    }
    const result = await projectsSvc.addFigureToProject(req.userId, params.data.id, body.data.figureId);
    if ("error" in result) {
      if (result.error === "project_not_found") return res.status(404).json({ error: "Project not found" });
      return res.status(404).json({ error: "Figure not found" });
    }
    res.json(result.project);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/figures/:figureId", async (req, res, next) => {
  try {
    const params = projectFigureParamsSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ error: "Invalid params", details: params.error.flatten() });
    }
    const result = await projectsSvc.removeFigureFromProject(
      req.userId,
      params.data.id,
      params.data.figureId,
    );
    if ("error" in result) {
      if (result.error === "project_not_found") return res.status(404).json({ error: "Project not found" });
      return res.status(404).json({ error: "Figure not found" });
    }
    res.json(result.project);
  } catch (err) {
    next(err);
  }
});

export default router;
