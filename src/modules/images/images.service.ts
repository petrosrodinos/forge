import fs from "fs/promises";
import path from "path";
import { getAiml } from "../../services";

const IMAGE_MODELS_PATH = path.resolve(__dirname, "../../../assets/image-models.json");

export async function listImageModels() {
  const raw = await fs.readFile(IMAGE_MODELS_PATH, "utf-8");
  return JSON.parse(raw);
}

export async function generateImage(input: {
  prompt: string;
  model?: string;
  size?: string;
  n?: number;
  steps?: number;
}) {
  return getAiml().generateImage({
    model: input.model ?? "flux/schnell",
    prompt: input.prompt,
    size: input.size,
    n: input.n,
    steps: input.steps,
  });
}

