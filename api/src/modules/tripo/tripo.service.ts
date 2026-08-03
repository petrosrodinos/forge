import axios from "axios";
import { getTripo } from "../../services";
import { extractTripoUploadToken } from "../../integrations/trippo/uploadToken";
import { fetchImageAsBuffer } from "../../lib/image-fetch.util";

import { TRIPO_CONFIG } from "./config/tripo.config";
import { parseAllowedModelUrl } from "./helpers/tripoUrlParsing.helper";
import { MODELS3D_CONFIG } from "../models3d/config/models3d.config";
import {
  meshOptionsToCreateFields,
  MULTIVIEW_SLOT_KEYS,
  resolveMeshOptions,
  type MeshOptionsInput,
  type ResolvedMeshOptions,
} from "./mesh-options";

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
    maxContentLength: TRIPO_CONFIG.PROXY_MAX_BYTES,
    validateStatus: (s) => s === 200,
  });

  const buffer = Buffer.from(upstream.data);
  if (buffer.length > TRIPO_CONFIG.PROXY_MAX_BYTES) {
    const err = new Error("model exceeds size limit");
    (err as Error & { status?: number }).status = 502;
    throw err;
  }

  let contentType = String(upstream.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
  if (!contentType || contentType === "application/octet-stream" || contentType === "binary/octet-stream") {
    contentType = MODELS3D_CONFIG.MODEL_GLTF_BINARY_CONTENT_TYPE;
  }

  return { buffer, contentType };
}

export async function getTask(taskId: string) {
  return getTripo().getTask(taskId);
}

async function uploadImageUrl(imageUrl: string): Promise<string> {
  const { buffer, mimeType } = await fetchImageAsBuffer(imageUrl.trim(), TRIPO_CONFIG.PROXY_MAX_BYTES);
  const uploadMime: "image/png" | "image/jpeg" = mimeType === "image/jpeg" ? "image/jpeg" : "image/png";
  const filename = uploadMime === "image/jpeg" ? "figure-source.jpg" : "figure-source.png";
  const upload = await getTripo().uploadFile(buffer, filename, uploadMime);
  return extractTripoUploadToken(upload);
}

export async function meshFromImageUrl(imageUrl: string, options?: MeshOptionsInput) {
  const opts = resolveMeshOptions(options);
  const fileToken = await uploadImageUrl(imageUrl);

  const { createTaskResponse: meshTask, costsMetadata: meshCostsMetadata } = await getTripo().createTask({
    type: TRIPO_CONFIG.TRIPO_TASK_TYPES.IMAGE_TO_MODEL,
    input: fileToken,
    ...meshOptionsToCreateFields(opts),
  } as never);

  const meshTaskId = (meshTask.data as Record<string, unknown>).task_id as string;
  if (!meshTaskId) throw new Error("Tripo did not return mesh task_id");
  return {
    meshTaskId,
    modelVersion: opts.model,
    meshOptions: opts,
    meshCostsMetadata,
  };
}

export async function meshFromImageUrls(imageUrls: string[], options?: MeshOptionsInput) {
  if (imageUrls.length < 2 || imageUrls.length > 4) {
    throw new Error("multiview requires 2 to 4 images");
  }
  const opts = resolveMeshOptions(options);
  const inputs: Array<Record<string, string>> = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const token = await uploadImageUrl(imageUrls[i]!);
    inputs.push({ [MULTIVIEW_SLOT_KEYS[i]!]: token });
  }

  const { createTaskResponse: meshTask, costsMetadata: meshCostsMetadata } = await getTripo().createTask({
    type: TRIPO_CONFIG.TRIPO_TASK_TYPES.MULTIVIEW_TO_MODEL,
    inputs,
    ...meshOptionsToCreateFields(opts),
  } as never);

  const meshTaskId = (meshTask.data as Record<string, unknown>).task_id as string;
  if (!meshTaskId) throw new Error("Tripo did not return mesh task_id");
  return {
    meshTaskId,
    modelVersion: opts.model,
    meshOptions: opts as ResolvedMeshOptions,
    meshCostsMetadata,
  };
}

export async function createPrerigCheck(meshTaskId: string) {
  const { createTaskResponse: out, costsMetadata } = await getTripo().createTask({
    type: TRIPO_CONFIG.TRIPO_TASK_TYPES.ANIMATE_PRERIGCHECK,
    original_model_task_id: meshTaskId.trim(),
  } as never);
  const prerigTaskId = (out.data as Record<string, unknown>).task_id as string;
  if (!prerigTaskId) throw new Error("Tripo did not return prerig task_id");
  return { prerigTaskId, costsMetadata };
}

export async function createRig(meshTaskId: string) {
  const { createTaskResponse: out, costsMetadata } = await getTripo().createTask({
    type: TRIPO_CONFIG.TRIPO_TASK_TYPES.ANIMATE_RIG,
    original_model_task_id: meshTaskId.trim(),
    out_format: TRIPO_CONFIG.TRIPO_OUT_FORMAT_GLb,
    model_version: "v2.5-20260210",
  } as never);
  const rigTaskId = (out.data as Record<string, unknown>).task_id as string;
  if (!rigTaskId) throw new Error("Tripo did not return rig task_id");
  return { rigTaskId, costsMetadata };
}

export async function createRetarget(rigTaskId: string, animation: string) {
  const { createTaskResponse: out, costsMetadata } = await getTripo().createTask({
    type: TRIPO_CONFIG.TRIPO_TASK_TYPES.ANIMATE_RETARGET,
    original_model_task_id: rigTaskId.trim(),
    out_format: TRIPO_CONFIG.TRIPO_OUT_FORMAT_GLb,
    animation: animation as never,
    bake_animation: true,
    export_with_geometry: true,
  } as never);
  const retargetTaskId = (out.data as Record<string, unknown>).task_id as string;
  if (!retargetTaskId) throw new Error("Tripo did not return retarget task_id");
  return { retargetTaskId, costsMetadata };
}
