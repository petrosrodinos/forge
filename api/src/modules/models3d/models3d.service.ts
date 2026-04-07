import { archiveRemoteUrl, deleteGcsFiles } from "../../integrations/gcs/gcs.service";
import { collectGcsKeysFromModel3D } from "../../integrations/gcs/collectGcsAssetKeys";
import { prisma } from "../../integrations/db/client";
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

function httpError(status: number, message: string): Error {
  const err = new Error(message);
  (err as Error & { status?: number }).status = status;
  return err;
}

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

/**
 * Validates that the image belongs to the user and is ready, then creates
 * a pending Model3D record. The actual mesh processing is handled by the
 * BullMQ mesh worker (see queue/processors/mesh.processor.ts).
 */
export async function initModel3DFromImage(args: { imageId: string; userId: string }) {
  const { imageId, userId } = args;

  const image = await prisma.skinImage.findFirst({
    where: { id: imageId, variant: { skin: { figure: { userId } } } },
  });
  if (!image) throw httpError(404, "Image not found");

  const imageUrl = image.gcsUrl ?? image.sourceUrl;
  if (!imageUrl || imageUrl.startsWith("upload://")) {
    throw httpError(400, "Image is not ready for mesh generation");
  }

  return createModel3DRepo(image.id);
}

/**
 * Validates that all images belong to the user and are ready, then creates
 * a pending Model3D record. The actual mesh processing is handled by the
 * BullMQ mesh worker (see queue/processors/mesh.processor.ts).
 */
export async function initModel3DFromImages(args: { imageIds: string[]; userId: string }) {
  const { imageIds, userId } = args;

  if (imageIds.length < 2 || imageIds.length > 4) {
    throw httpError(400, "imageIds must contain 2 to 4 items");
  }

  const uniqueImageIds = [...new Set(imageIds)];
  if (uniqueImageIds.length !== imageIds.length) {
    throw httpError(400, "imageIds must be unique");
  }

  const images = await prisma.skinImage.findMany({
    where: { id: { in: imageIds }, variant: { skin: { figure: { userId } } } },
  });
  if (images.length !== imageIds.length) throw httpError(404, "One or more images not found");

  const byId = new Map(images.map((img) => [img.id, img]));
  const ordered = imageIds.map((id) => byId.get(id)!);

  const variantId = ordered[0].variantId;
  if (!ordered.every((img) => img.variantId === variantId)) {
    throw httpError(400, "All selected images must be from the same variant");
  }

  if (ordered.some((img) => { const u = img.gcsUrl ?? img.sourceUrl; return !u || u.startsWith("upload://"); })) {
    throw httpError(400, "One or more images are not ready for mesh generation");
  }

  return createModel3DRepo(ordered[0].id);
}
