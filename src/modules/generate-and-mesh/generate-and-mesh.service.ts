import { getAiml, getTripo } from "../../services";
import { extractTripoUploadToken } from "../../integrations/trippo/uploadToken";
import type { ModelVersion } from "../../integrations/trippo/types";
import { fetchImageAsBuffer } from "../shared/image-fetch.util";

const DEFAULT_MODEL_VERSION = "v2.5-20250123";
const PROXY_MAX_BYTES = 150 * 1024 * 1024;

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
    model: input.model ?? "flux/schnell",
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
    type: "image_to_model",
    file: { type: ext, file_token: fileToken },
    model_version: (input.meshModelVersion ?? input.modelVersion ?? DEFAULT_MODEL_VERSION) as ModelVersion,
    texture: true,
    pbr: true,
  } as never);

  const meshTaskId = (meshTask.data as Record<string, unknown>).task_id as string;
  if (!meshTaskId) throw new Error("Tripo did not return mesh task_id");

  const task = await getTripo().pollTask(meshTaskId, {
    intervalMs: 2000,
    timeoutMs: input.timeoutMs ?? 600_000,
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

