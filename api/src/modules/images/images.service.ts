import { getAiml } from "../../services";
import { IMAGES_CONFIG } from "./config/images.config";
import { ImageModels } from "../../config/models/image-models";

export async function listImageModels() {
  return ImageModels.filter(model => model.available);
}

export async function generateImage(input: {
  prompt: string;
  model?: string;
  size?: string;
  n?: number;
  steps?: number;
}) {
  return getAiml().generateImage({
    model: input.model ?? IMAGES_CONFIG.DEFAULT_AIML_IMAGE_MODEL,
    prompt: input.prompt,
    size: input.size,
    n: input.n,
    steps: input.steps,
  });
}

