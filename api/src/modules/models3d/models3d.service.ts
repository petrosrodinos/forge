import { archiveRemoteUrl, deleteGcsFiles } from "../../integrations/gcs/gcs.service";
import { collectGcsKeysFromModel3D } from "../../integrations/gcs/collectGcsAssetKeys";
import { prisma } from "../../integrations/db/client";
import { getTripo } from "../../services";
import { fetchImageAsBuffer } from "../../lib/image-fetch.util";
import { extractTripoUploadToken } from "../../integrations/trippo/uploadToken";
import { tripoTaskRasterType } from "../../integrations/trippo/tripoTaskFileType";
import type { TaskIds, TripoModelUrls } from "./interfaces/models3d.types";
import {
  createModel3D as createModel3DRepo,
  deleteModel3D as deleteModel3DRepo,
  getModel3D as getModel3DRepo,
  setModel3DFailed,
  setModel3DSuccess,
  updateModel3DProcessing as updateModel3DProcessingRepo,
} from "./repositories/models3d.repository";
import { MODELS3D_CONFIG } from "./config/models3d.config";
import { meshFromImageUrl } from "../tripo/tripo.service";
import { TRIPO_JOB_CONFIG } from "../tripo/tripo-job.config";
import { TRIPO_CONFIG } from "../tripo/config/tripo.config";
import type { ModelVersion } from "../../integrations/trippo/types";

export async function createModel3D(imageId: string) {
  return createModel3DRepo(imageId);
}

export async function updateModel3DProcessing(id: string, taskIds: TaskIds) {
  return updateModel3DProcessingRepo(id, taskIds);
}

export async function finalizeModel3D(id: string, _modelId: string, tripoUrls: TripoModelUrls) {
  const [pbr, plain] = await Promise.all([
    archiveRemoteUrl(tripoUrls.pbrModelSourceUrl, `models3d/${id}/pbr.glb`,   MODELS3D_CONFIG.MODEL_GLTF_BINARY_CONTENT_TYPE),
    archiveRemoteUrl(tripoUrls.modelSourceUrl,    `models3d/${id}/model.glb`, MODELS3D_CONFIG.MODEL_GLTF_BINARY_CONTENT_TYPE),
  ]);

  return setModel3DSuccess({
    id,
    tripoUrls,
    gcsPbr: { gcsUrl: pbr.gcsUrl, gcsKey: pbr.gcsKey },
    gcsPlain: { gcsUrl: plain.gcsUrl, gcsKey: plain.gcsKey },
  });
}

export async function failModel3D(id: string, error: string) {
  return setModel3DFailed(id, error);
}

export async function getModel3D(id: string) {
  return getModel3DRepo(id);
}

export async function deleteModel3D(id: string) {
  const existing = await getModel3DRepo(id);
  if (existing) await deleteGcsFiles(collectGcsKeysFromModel3D(existing));
  return deleteModel3DRepo(id);
}

export async function createModel3DFromImage(args: { imageId: string; userId: string }) {
  const { imageId, userId } = args;
  const image = await prisma.skinImage.findFirst({
    where: {
      id: imageId,
      variant: {
        skin: {
          figure: { userId },
        },
      },
    },
  });
  if (!image) {
    const err = new Error("Image not found");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }

  const imageUrl = image.gcsUrl ?? image.sourceUrl;
  if (!imageUrl || imageUrl.startsWith("upload://")) {
    const err = new Error("Image is not ready for mesh generation");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const model = await createModel3DRepo(image.id);
  try {
    const { meshTaskId } = await meshFromImageUrl(imageUrl);
    await updateModel3DProcessingRepo(model.id, { meshTaskId });

    const task = await getTripo().pollTask(meshTaskId, {
      intervalMs: TRIPO_JOB_CONFIG.DEFAULT_POLL_INTERVAL_MS,
      timeoutMs: TRIPO_JOB_CONFIG.MESH_POLL_TIMEOUT_MS,
    });

    const pbrModelSourceUrl = task.output?.pbr_model ?? task.output?.model ?? task.output?.base_model;
    const modelSourceUrl = task.output?.model ?? pbrModelSourceUrl;
    if (!pbrModelSourceUrl || !modelSourceUrl) {
      throw new Error("Tripo returned no model URL");
    }

    await finalizeModel3D(model.id, "image_to_model", { pbrModelSourceUrl, modelSourceUrl });
    return getModel3DRepo(model.id);
  } catch (err) {
    await failModel3D(model.id, err instanceof Error ? err.message : String(err)).catch(() => {});
    throw err;
  }
}

export async function createModel3DFromImages(args: { imageIds: string[]; userId: string }) {
  const { imageIds, userId } = args;
  if (imageIds.length < 2 || imageIds.length > 4) {
    const err = new Error("imageIds must contain 2 to 4 items");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const uniqueImageIds = [...new Set(imageIds)];
  if (uniqueImageIds.length !== imageIds.length) {
    const err = new Error("imageIds must be unique");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const images = await prisma.skinImage.findMany({
    where: {
      id: { in: imageIds },
      variant: {
        skin: {
          figure: { userId },
        },
      },
    },
  });
  if (images.length !== imageIds.length) {
    const err = new Error("One or more images not found");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }

  const byId = new Map(images.map((img) => [img.id, img]));
  const ordered = imageIds.map((id) => byId.get(id)!);
  const variantId = ordered[0].variantId;
  if (!ordered.every((img) => img.variantId === variantId)) {
    const err = new Error("All selected images must be from the same variant");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const sourceUrls = ordered.map((img) => img.gcsUrl ?? img.sourceUrl);
  if (sourceUrls.some((u) => !u || u.startsWith("upload://"))) {
    const err = new Error("One or more images are not ready for mesh generation");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const model = await createModel3DRepo(ordered[0].id);
  try {
    const files = [] as Array<{ type: "jpg" | "png"; file_token: string }>;
    for (const sourceUrl of sourceUrls) {
      const { buffer, mimeType } = await fetchImageAsBuffer(sourceUrl!, TRIPO_CONFIG.PROXY_MAX_BYTES);
      const filename = mimeType === "image/jpeg" ? "figure-source.jpg" : "figure-source.png";
      const upload = await getTripo().uploadFile(buffer, filename, mimeType);
      const fileToken = extractTripoUploadToken(upload);
      files.push({ type: tripoTaskRasterType(mimeType), file_token: fileToken });
    }

    const { createTaskResponse: meshTask } = await getTripo().createTask({
      type: TRIPO_CONFIG.TRIPO_TASK_TYPES.MULTIVIEW_TO_MODEL,
      files,
      model_version: TRIPO_CONFIG.DEFAULT_TRIPO_MODEL_VERSION as ModelVersion,
      texture: true,
      pbr: true,
    } as never);

    const meshTaskId = meshTask.data.task_id;
    if (!meshTaskId) throw new Error("Tripo did not return mesh task_id");
    await updateModel3DProcessingRepo(model.id, { meshTaskId });

    const task = await getTripo().pollTask(meshTaskId, {
      intervalMs: TRIPO_JOB_CONFIG.DEFAULT_POLL_INTERVAL_MS,
      timeoutMs: TRIPO_JOB_CONFIG.MESH_POLL_TIMEOUT_MS,
    });

    const pbrModelSourceUrl = task.output?.pbr_model ?? task.output?.model ?? task.output?.base_model;
    const modelSourceUrl = task.output?.model ?? pbrModelSourceUrl;
    if (!pbrModelSourceUrl || !modelSourceUrl) throw new Error("Tripo returned no model URL");

    await finalizeModel3D(model.id, "multiview_to_model", { pbrModelSourceUrl, modelSourceUrl });
    return getModel3DRepo(model.id);
  } catch (err) {
    await failModel3D(model.id, err instanceof Error ? err.message : String(err)).catch(() => {});
    throw err;
  }
}
