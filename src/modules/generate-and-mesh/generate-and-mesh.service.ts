import { getAiml, getTripo } from "../../services";
import { extractTripoUploadToken } from "../../integrations/trippo/uploadToken";
import type { ModelVersion } from "../../integrations/trippo/types";
import { fetchImageAsBuffer } from "../../lib/image-fetch.util";

import { PROXY_MAX_BYTES } from "../../constants/limits";
import { DEFAULT_TRIPO_MODEL_VERSION } from "../../constants/tripoModels";
import { DEFAULT_AIML_IMAGE_MODEL } from "../../constants/aimlModels";
import { DEFAULT_POLL_INTERVAL_MS, DEFAULT_POLL_TIMEOUT_MS } from "../../constants/pipeline";
import { TRIPO_TASK_TYPES } from "../../constants/tripoTaskTypes";

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
  const imageResult = await getAiml().generateImage({
    model: input.model ?? DEFAULT_AIML_IMAGE_MODEL,
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

  const { buffer, mimeType } = await fetchImageAsBuffer(imageUrl, PROXY_MAX_BYTES);
  const ext = mimeType === "image/jpeg" ? "jpeg" : "png";
  const filename = ext === "jpeg" ? "figure-source.jpg" : "figure-source.png";

  const upload = await getTripo().uploadFile(buffer, filename, mimeType);
  const fileToken = extractTripoUploadToken(upload);

  const meshTask = await getTripo().createTask({
    type: TRIPO_TASK_TYPES.IMAGE_TO_MODEL,
    file: { type: ext, file_token: fileToken },
    model_version: (input.meshModelVersion ?? input.modelVersion ?? DEFAULT_TRIPO_MODEL_VERSION) as ModelVersion,
    texture: true,
    pbr: true,
  } as never);

  const meshTaskId = (meshTask.data as Record<string, unknown>).task_id as string;
  if (!meshTaskId) throw new Error("Tripo did not return mesh task_id");

  const task = await getTripo().pollTask(meshTaskId, {
    intervalMs: DEFAULT_POLL_INTERVAL_MS,
    timeoutMs: input.timeoutMs ?? DEFAULT_POLL_TIMEOUT_MS,
  });

  const pbrModelUrl = task.output?.pbr_model ?? null;
  const modelUrl = task.output?.model ?? pbrModelUrl;

  return {
    imageUrl,
    meshTaskId,
    pbrModelUrl,
    modelUrl: modelUrl ?? null,
  };
}

