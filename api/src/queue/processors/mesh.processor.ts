import type { Job } from "bullmq";
import { prisma } from "../../integrations/db/client";
import { getTripo } from "../../services";
import { fetchImageAsBuffer } from "../../lib/image-fetch.util";
import { extractTripoUploadToken } from "../../integrations/trippo/uploadToken";
import { tripoTaskRasterType } from "../../integrations/trippo/tripoTaskFileType";
import { meshFromImageUrl } from "../../modules/tripo/tripo.service";
import { finalizeModel3D, failModel3D, getModel3D } from "../../modules/models3d/models3d.service";
import { updateModel3DProcessing } from "../../modules/models3d/repositories/models3d.repository";
import { TRIPO_JOB_CONFIG } from "../../modules/tripo/tripo-job.config";
import { TRIPO_CONFIG } from "../../modules/tripo/config/tripo.config";
import type { ModelVersion } from "../../integrations/trippo/types";
import { JOB_NAMES } from "../job.types";
import type { MeshFromImageJobData, MeshFromImagesJobData } from "../job.types";

async function processMeshFromImage(job: Job<MeshFromImageJobData>): Promise<object> {
  const { model3dId, imageId } = job.data;

  const image = await prisma.skinImage.findFirst({ where: { id: imageId } });
  if (!image) throw new Error("Image not found");

  const imageUrl = image.gcsUrl ?? image.sourceUrl;
  if (!imageUrl || imageUrl.startsWith("upload://")) {
    throw new Error("Image is not ready for mesh generation");
  }

  await job.updateProgress({ step: "mesh", status: "running" });

  const { meshTaskId } = await meshFromImageUrl(imageUrl);
  await updateModel3DProcessing(model3dId, { meshTaskId });
  await job.updateProgress({ step: "mesh", status: "queued", taskId: meshTaskId });

  const task = await getTripo().pollTask(meshTaskId, {
    intervalMs: TRIPO_JOB_CONFIG.DEFAULT_POLL_INTERVAL_MS,
    timeoutMs: TRIPO_JOB_CONFIG.MESH_POLL_TIMEOUT_MS,
  });

  const pbrModelSourceUrl = task.output?.pbr_model ?? task.output?.model ?? task.output?.base_model;
  const modelSourceUrl = task.output?.model ?? pbrModelSourceUrl;
  if (!pbrModelSourceUrl || !modelSourceUrl) throw new Error("Tripo returned no model URL");

  await finalizeModel3D(model3dId, "image_to_model", { pbrModelSourceUrl, modelSourceUrl });
  await job.updateProgress({ step: "mesh", status: "success" });

  return (await getModel3D(model3dId)) ?? {};
}

async function processMeshFromImages(job: Job<MeshFromImagesJobData>): Promise<object> {
  const { model3dId, imageIds } = job.data;

  const images = await prisma.skinImage.findMany({ where: { id: { in: imageIds } } });
  if (images.length !== imageIds.length) throw new Error("One or more images not found");

  const byId = new Map(images.map((img) => [img.id, img]));
  const ordered = imageIds.map((id) => byId.get(id)!);

  const sourceUrls = ordered.map((img) => img.gcsUrl ?? img.sourceUrl);
  if (sourceUrls.some((u) => !u || u.startsWith("upload://"))) {
    throw new Error("One or more images are not ready for mesh generation");
  }

  await job.updateProgress({ step: "mesh", status: "running" });

  const files: Array<{ type: "jpg" | "png"; file_token: string }> = [];
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

  const meshTaskId = (meshTask.data as Record<string, unknown>).task_id as string;
  if (!meshTaskId) throw new Error("Tripo did not return mesh task_id");

  await updateModel3DProcessing(model3dId, { meshTaskId });
  await job.updateProgress({ step: "mesh", status: "queued", taskId: meshTaskId });

  const task = await getTripo().pollTask(meshTaskId, {
    intervalMs: TRIPO_JOB_CONFIG.DEFAULT_POLL_INTERVAL_MS,
    timeoutMs: TRIPO_JOB_CONFIG.MESH_POLL_TIMEOUT_MS,
  });

  const pbrModelSourceUrl = task.output?.pbr_model ?? task.output?.model ?? task.output?.base_model;
  const modelSourceUrl = task.output?.model ?? pbrModelSourceUrl;
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
    const model3dId = (job.data as { model3dId?: string }).model3dId;
    if (model3dId) {
      await failModel3D(model3dId, err instanceof Error ? err.message : String(err)).catch(() => {});
    }
    throw err;
  }
}
