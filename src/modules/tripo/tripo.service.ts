import axios from "axios";
import { getTripo } from "../../services";
import { extractTripoUploadToken } from "../../integrations/trippo/uploadToken";
import type { ModelVersion } from "../../integrations/trippo/types";
import { fetchImageAsBuffer } from "../../lib/image-fetch.util";

const DEFAULT_MODEL_VERSION = "v2.5-20250123";
const PROXY_MAX_BYTES = 150 * 1024 * 1024;

function isAllowedTripoMeshHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h.endsWith(".tripo3d.com") || h.endsWith(".tripo3d.ai");
}

function parseAllowedModelUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (!isAllowedTripoMeshHost(u.hostname)) return null;
  return u;
}

export async function proxyModelByUrl(rawUrl: string) {
  const target = parseAllowedModelUrl(rawUrl);
  if (!target) {
    const err = new Error("url must be https and a Tripo asset host (*.tripo3d.com / *.tripo3d.ai)");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }

  const upstream = await axios.get<ArrayBuffer>(target.href, {
    responseType: "arraybuffer",
    timeout: 180_000,
    maxContentLength: PROXY_MAX_BYTES,
    validateStatus: (s) => s === 200,
  });

  const buffer = Buffer.from(upstream.data);
  if (buffer.length > PROXY_MAX_BYTES) {
    const err = new Error("model exceeds size limit");
    (err as Error & { status?: number }).status = 502;
    throw err;
  }

  let contentType = String(upstream.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
  if (!contentType || contentType === "application/octet-stream" || contentType === "binary/octet-stream") {
    contentType = "model/gltf-binary";
  }

  return { buffer, contentType };
}

export async function getTask(taskId: string) {
  return getTripo().getTask(taskId);
}

export async function meshFromImageUrl(imageUrl: string, modelVersion?: ModelVersion) {
  const { buffer, mimeType } = await fetchImageAsBuffer(imageUrl.trim(), PROXY_MAX_BYTES);
  const tripo = getTripo();
  const ext = mimeType === "image/jpeg" ? "jpeg" : "png";
  const filename = ext === "jpeg" ? "figure-source.jpg" : "figure-source.png";

  const upload = await tripo.uploadFile(buffer, filename, mimeType);
  const fileToken = extractTripoUploadToken(upload);

  const meshTask = await tripo.createTask({
    type: "image_to_model",
    file: { type: ext, file_token: fileToken },
    model_version: modelVersion ?? DEFAULT_MODEL_VERSION,
    texture: true,
    pbr: true,
  } as never);

  const meshTaskId = (meshTask.data as Record<string, unknown>).task_id as string;
  if (!meshTaskId) throw new Error("Tripo did not return mesh task_id");
  return { meshTaskId, modelVersion: modelVersion ?? DEFAULT_MODEL_VERSION };
}

export async function createPrerigCheck(meshTaskId: string) {
  const out = await getTripo().createTask({
    type: "animate_prerigcheck",
    original_model_task_id: meshTaskId.trim(),
  } as never);
  const prerigTaskId = (out.data as Record<string, unknown>).task_id as string;
  if (!prerigTaskId) throw new Error("Tripo did not return prerig task_id");
  return { prerigTaskId };
}

export async function createRig(meshTaskId: string) {
  const out = await getTripo().createTask({
    type: "animate_rig",
    original_model_task_id: meshTaskId.trim(),
    out_format: "glb",
  } as never);
  const rigTaskId = (out.data as Record<string, unknown>).task_id as string;
  if (!rigTaskId) throw new Error("Tripo did not return rig task_id");
  return { rigTaskId };
}

export async function createRetarget(rigTaskId: string, animation: string) {
  const out = await getTripo().createTask({
    type: "animate_retarget",
    original_model_task_id: rigTaskId.trim(),
    out_format: "glb",
    animation: animation as never,
    bake_animation: true,
    export_with_geometry: true,
  } as never);
  const retargetTaskId = (out.data as Record<string, unknown>).task_id as string;
  if (!retargetTaskId) throw new Error("Tripo did not return retarget task_id");
  return { retargetTaskId };
}

