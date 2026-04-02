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

router.post("/:id/generate-image", async (req, res, next) => {
  try {
    const { variant, prompt } = req.body as { variant?: "A" | "B"; prompt?: string };
    if (variant !== "A" && variant !== "B") {
      return res.status(400).json({ error: "variant must be A or B" });
    }
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const result = await figuresSvc.generateAndSaveFigureImage({
      figureId: req.params.id,
      skinName: req.body.skinName,
      variant,
      model: req.body.model,
      prompt: prompt.trim(),
      negativePrompt: req.body.negativePrompt,
      size: req.body.size,
      steps: req.body.steps,
    });
    res.status(201).json(result);
  } catch (err) { next(err); }
});

export default router;
