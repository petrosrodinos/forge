import type { Request, Response } from "express";
import { generateAndMesh } from "./generate-and-mesh.service";
import { DEFAULT_POLL_TIMEOUT_MS } from "../../constants/pipeline";

export async function generateAndMeshController(req: Request, res: Response) {
  try {
    const {
      prompt,
      model,
      size,
      steps,
      n = 1,
      modelVersion,
      meshModelVersion,
      timeoutMs = DEFAULT_POLL_TIMEOUT_MS,
    } = req.body as Record<string, unknown>;

    if (typeof prompt !== "string" || !prompt.trim()) {
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    const result = await generateAndMesh({
      prompt,
      model: typeof model === "string" ? model : undefined,
      size: typeof size === "string" ? size : undefined,
      steps: typeof steps === "number" ? steps : undefined,
      n: typeof n === "number" ? n : undefined,
      modelVersion: typeof modelVersion === "string" ? modelVersion : undefined,
      meshModelVersion: typeof meshModelVersion === "string" ? meshModelVersion : undefined,
      timeoutMs: typeof timeoutMs === "number" ? timeoutMs : undefined,
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}

