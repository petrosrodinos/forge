import { Router } from "express";
import * as figuresSvc from "./figures.service";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    res.json(await figuresSvc.listFigures());
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const figure = await figuresSvc.getFigureById(req.params.id);
    if (!figure) return res.status(404).json({ error: "Figure not found" });
    res.json(figure);
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: "name is required" });
    res.status(201).json(await figuresSvc.createFigure(req.body));
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    res.json(await figuresSvc.updateFigure(req.params.id, req.body));
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    res.json(await figuresSvc.deleteFigure(req.params.id));
  } catch (err) { next(err); }
});

export default router;
