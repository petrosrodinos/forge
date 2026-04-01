import { Router } from "express";
import path from "path";
import fs from "fs/promises";
import { getAiml } from "../services";

const router = Router();

const IMAGE_MODELS_PATH = path.resolve(__dirname, "../../assets/image-models.json");

router.get("/models", async (_req, res) => {
  try {
    const raw = await fs.readFile(IMAGE_MODELS_PATH, "utf-8");
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/generate", async (req, res) => {
  const { prompt, model = "flux/schnell", size, n, steps } = req.body as Record<string, unknown>;

  try {
    const result = await getAiml().generateImage({
      model: model as string,
      prompt: prompt as string,
      size: size as string | undefined,
      n: n as number | undefined,
      steps: steps as number | undefined,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
