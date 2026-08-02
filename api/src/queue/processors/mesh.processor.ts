import type { Job } from "bullmq";
import { prisma } from "../../integrations/db/client";
import { getTripo } from "../../services";
import { meshFromImageUrl, meshFromImageUrls } from "../../modules/tripo/tripo.service";
import { finalizeModel3D, failModel3D, getModel3D } from "../../modules/models3d/models3d.service";
import { updateModel3DProcessing } from "../../modules/models3d/repositories/models3d.repository";
import { refundTokenUsageByIdempotencyKey } from "../../modules/tokens/tokens.service";
import { TRIPO_JOB_CONFIG } from "../../modules/tripo/tripo-job.config";
import { resolveMeshOptions, type MeshOptionsInput } from "../../modules/tripo/mesh-options";
import { JOB_NAMES } from "../job.types";
import type { MeshFromImageJobData, MeshFromImagesJobData } from "../job.types";

async function processMeshFromImage(job: Job<MeshFromImageJobData>): Promise<object> {
  const { model3dId, imageId, meshOptions } = job.data;

  const image = await prisma.skinImage.findFirst({ where: { id: imageId } });
  if (!image) throw new Error("Image not found");

  const imageUrl = image.gcsUrl ?? image.sourceUrl;
  if (!imageUrl || imageUrl.startsWith("upload://")) {
    throw new Error("Image is not ready for mesh generation");
  }

  await job.updateProgress({ step: "mesh", status: "running" });

  const opts = resolveMeshOptions(meshOptions as MeshOptionsInput | undefined);
  const { meshTaskId } = await meshFromImageUrl(imageUrl, opts);
  await updateModel3DProcessing(model3dId, { meshTaskId });
  await job.updateProgress({ step: "mesh", status: "queued", taskId: meshTaskId });

  const task = await getTripo().pollTask(meshTaskId, {
    intervalMs: TRIPO_JOB_CONFIG.DEFAULT_POLL_INTERVAL_MS,
    timeoutMs: TRIPO_JOB_CONFIG.MESH_POLL_TIMEOUT_MS,
  });

  const pbrModelSourceUrl = task.output?.model_url;
  const modelSourceUrl = pbrModelSourceUrl;
  if (!pbrModelSourceUrl || !modelSourceUrl) throw new Error("Tripo returned no model URL");

  await finalizeModel3D(model3dId, "image_to_model", { pbrModelSourceUrl, modelSourceUrl });
  await job.updateProgress({ step: "mesh", status: "success" });

  return (await getModel3D(model3dId)) ?? {};
}

async function processMeshFromImages(job: Job<MeshFromImagesJobData>): Promise<object> {
  const { model3dId, imageIds, meshOptions } = job.data;

  const images = await prisma.skinImage.findMany({ where: { id: { in: imageIds } } });
  if (images.length !== imageIds.length) throw new Error("One or more images not found");

  const byId = new Map(images.map((img) => [img.id, img]));
  const ordered = imageIds.map((id) => byId.get(id)!);

  const sourceUrls = ordered.map((img) => img.gcsUrl ?? img.sourceUrl);
  if (sourceUrls.some((u) => !u || u.startsWith("upload://"))) {
    throw new Error("One or more images are not ready for mesh generation");
  }

  await job.updateProgress({ step: "mesh", status: "running" });

  const opts = resolveMeshOptions(meshOptions as MeshOptionsInput | undefined);
  const { meshTaskId } = await meshFromImageUrls(sourceUrls as string[], opts);
  if (!meshTaskId) throw new Error("Tripo did not return mesh task_id");

  await updateModel3DProcessing(model3dId, { meshTaskId });
  await job.updateProgress({ step: "mesh", status: "queued", taskId: meshTaskId });

  const task = await getTripo().pollTask(meshTaskId, {
    intervalMs: TRIPO_JOB_CONFIG.DEFAULT_POLL_INTERVAL_MS,
    timeoutMs: TRIPO_JOB_CONFIG.MESH_POLL_TIMEOUT_MS,
  });

  const pbrModelSourceUrl = task.output?.model_url;
  const modelSourceUrl = pbrModelSourceUrl;
  if (!pbrModelSourceUrl || !modelSourceUrl) throw new Error("Tripo returned no model URL");

  await finalizeModel3D(model3dId, "multiview_to_model", { pbrModelSourceUrl, modelSourceUrl });
  await job.updateProgress({ step: "mesh", status: "success" });

  return (await getModel3D(model3dId)) ?? {};
}

export async function processMeshJob(job: Job): Promise<object> {
  try {
    if (job.name === JOB_NAMES.MESH_FROM_IMAGE) {
      return await processMeshFromImage(job as Job<MeshFromImageJobData>);
    }
    if (job.name === JOB_NAMES.MESH_FROM_IMAGES) {
      return await processMeshFromImages(job as Job<MeshFromImagesJobData>);
    }
    throw new Error(`Unknown mesh job name: ${job.name}`);
  } catch (err) {
    const data = job.data as { model3dId?: string; tokenUsageIdempotencyKey?: string };
    if (data.model3dId) {
      await failModel3D(data.model3dId, err instanceof Error ? err.message : String(err)).catch(() => {});
    }
    if (data.tokenUsageIdempotencyKey) {
      await refundTokenUsageByIdempotencyKey(data.tokenUsageIdempotencyKey).catch(() => {});
    }
    throw err;
  }
}
