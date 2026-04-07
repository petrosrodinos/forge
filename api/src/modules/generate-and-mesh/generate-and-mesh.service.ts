import { getAiml, getTripo } from "../../services";
import { tripoTaskRasterType } from "../../integrations/trippo/tripoTaskFileType";
import { extractTripoUploadToken } from "../../integrations/trippo/uploadToken";
import type { ModelVersion } from "../../integrations/trippo/types";
import { fetchImageAsBuffer } from "../../lib/image-fetch.util";

import { IMAGES_CONFIG } from "../images/config/images.config";
import { TRIPO_CONFIG } from "../tripo/config/tripo.config";
import { TRIPO_JOB_CONFIG } from "../tripo/tripo-job.config";

export async function generateAndMesh(input: {
  prompt: string;
  model?: string;
  size?: string;
  steps?: number;
  n?: number;
  modelVersion?: string;
  meshModelVersion?: string;
  timeoutMs?: number;
}) {
  const { data: imageResult, costsMetadata: aimlCostsMetadata } = await getAiml().generateImage({
    model: input.model ?? IMAGES_CONFIG.DEFAULT_AIML_IMAGE_MODEL,
    prompt: input.prompt.trim(),
    size: input.size,
    n: input.n,
    steps: input.steps,
  });

  const first = imageResult.data?.[0];
  const imageUrl = first?.url ?? (first?.b64_json ? `data:image/png;base64,${first.b64_json}` : null);
  if (!imageUrl || typeof imageUrl !== "string") {
    throw new Error("Image generation returned no URL/b64_json");
  }

  const { buffer, mimeType } = await fetchImageAsBuffer(imageUrl, TRIPO_CONFIG.PROXY_MAX_BYTES);
  const filename = mimeType === "image/jpeg" ? "figure-source.jpg" : "figure-source.png";

  const upload = await getTripo().uploadFile(buffer, filename, mimeType);
  const fileToken = extractTripoUploadToken(upload);

  const { createTaskResponse: meshTask, costsMetadata: trippoCostsMetadata } = await getTripo().createTask({
    type: TRIPO_CONFIG.TRIPO_TASK_TYPES.IMAGE_TO_MODEL,
    file: { type: tripoTaskRasterType(mimeType), file_token: fileToken },
    model_version: (input.meshModelVersion ?? input.modelVersion ?? TRIPO_CONFIG.DEFAULT_TRIPO_MODEL_VERSION) as ModelVersion,
    texture: true,
    pbr: true,
  } as never);

  const meshTaskId = meshTask.data.task_id;
  if (!meshTaskId) throw new Error("Tripo did not return mesh task_id");

  const task = await getTripo().pollTask(meshTaskId, {
    intervalMs: TRIPO_JOB_CONFIG.DEFAULT_POLL_INTERVAL_MS,
    timeoutMs: input.timeoutMs ?? TRIPO_JOB_CONFIG.DEFAULT_POLL_TIMEOUT_MS,
  });

  const pbrModelUrl = task.output?.pbr_model ?? null;
  const modelUrl = task.output?.model ?? pbrModelUrl;

  return {
    imageUrl,
    meshTaskId,
    pbrModelUrl,
    modelUrl: modelUrl ?? null,
    aimlCostsMetadata,
    trippoCostsMetadata,
  };
}

