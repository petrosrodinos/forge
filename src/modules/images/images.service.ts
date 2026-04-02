import fs from "fs/promises";
import { getAiml } from "../../services";
import { DEFAULT_AIML_IMAGE_MODEL } from "../../constants/aimlModels";
import { IMAGE_MODELS_PATH } from "../../constants/imageModelsPath";

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
    model: input.model ?? DEFAULT_AIML_IMAGE_MODEL,
    prompt: input.prompt,
    size: input.size,
    n: input.n,
    steps: input.steps,
  });
}

