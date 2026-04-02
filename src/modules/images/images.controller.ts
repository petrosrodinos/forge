import type { Request, Response } from "express";
import { generateImage, listImageModels } from "./images.service";

export async function listImageModelsController(_req: Request, res: Response) {
  try {
    res.json(await listImageModels());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}

export async function generateImageController(req: Request, res: Response) {
  const { prompt, model, size, n, steps } = req.body as Record<string, unknown>;
  if (typeof prompt !== "string" || !prompt.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  try {
    const result = await generateImage({
      prompt,
      model: typeof model === "string" ? model : undefined,
      size: typeof size === "string" ? size : undefined,
      n: typeof n === "number" ? n : undefined,
      steps: typeof steps === "number" ? steps : undefined,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}

