import { getTripo } from "../../services";
import { extractTripoUploadToken } from "../../integrations/trippo/uploadToken";
import { uploadBuffer } from "../../integrations/gcs/gcs.service";
import * as skinImageSvc from "../skin-images/skin-images.service";
import * as model3dSvc from "../models3d/models3d.service";
import type { RunPipelineOpts } from "./interfaces/pipeline.types";
import { PIPELINE_CONFIG } from "./config/pipeline.config";
import { TRIPO_CONFIG } from "../tripo/config/tripo.config";

export async function runPipeline(opts: RunPipelineOpts) {
  const {
    figureId,
    variantId,
    skinImageId,
    imageBuffer,
    filename,
    mimeType,
    modelVersion,
    emitProgress,
    emitEvent,
  } = opts;

  let model: Awaited<ReturnType<typeof model3dSvc.createModel3D>> | undefined;
  const tripo = getTripo();

  try {
    // ── Image record ─────────────────────────────────────────────────────
    let resolvedSkinImageId: string;
    if (skinImageId) {
      resolvedSkinImageId = skinImageId;
    } else {
      const ext    = mimeType === "image/jpeg" ? "jpg" : "png";
      const gcsKey = `images/figures/${figureId}/${variantId}/${Date.now()}-source.${ext}`;
      const { gcsUrl } = await uploadBuffer(imageBuffer, gcsKey, mimeType);
      const skinImage  = await skinImageSvc.createSkinImage(variantId, figureId, gcsUrl);
      resolvedSkinImageId = skinImage.id;
    }

    model = await model3dSvc.createModel3D(resolvedSkinImageId);

    // ── 1. Upload ────────────────────────────────────────────────────────
    emitProgress({ step: PIPELINE_CONFIG.PIPELINE_STEPS.UPLOAD, status: PIPELINE_CONFIG.PIPELINE_STATUSES.RUNNING });
    const uploadResult = await tripo.uploadFile(imageBuffer, filename, mimeType);
    const fileToken    = extractTripoUploadToken(uploadResult);
    emitProgress({ step: PIPELINE_CONFIG.PIPELINE_STEPS.UPLOAD, status: PIPELINE_CONFIG.PIPELINE_STATUSES.SUCCESS });

    // ── 2. Mesh generation ───────────────────────────────────────────────
    emitProgress({ step: PIPELINE_CONFIG.PIPELINE_STEPS.MESH, status: PIPELINE_CONFIG.PIPELINE_STATUSES.RUNNING });
    const { createTaskResponse: meshTask, costsMetadata: meshCostsMetadata } = await tripo.createTask({
      type: TRIPO_CONFIG.TRIPO_TASK_TYPES.IMAGE_TO_MODEL,
      file: { type: mimeType === "image/jpeg" ? "jpeg" : "png", file_token: fileToken },
      model_version: modelVersion as never,
      texture: true,
      pbr: true,
    } as never);
    const meshTaskId = (meshTask.data as { task_id?: string }).task_id as string;
    await opts.onMeshTaskCostsMetadata?.(meshCostsMetadata);

    await model3dSvc.updateModel3DProcessing(model.id, { meshTaskId });
    emitProgress({ step: PIPELINE_CONFIG.PIPELINE_STEPS.MESH, status: PIPELINE_CONFIG.PIPELINE_STATUSES.QUEUED, data: { taskId: meshTaskId } });

    const meshResult   = await tripo.pollTask(meshTaskId, { intervalMs: PIPELINE_CONFIG.DEFAULT_POLL_INTERVAL_MS, timeoutMs: PIPELINE_CONFIG.MESH_POLL_TIMEOUT_MS });
    const pbrModelUrl  = meshResult.output?.pbr_model ?? meshResult.output?.model ?? "";
    const meshModelUrl = meshResult.output?.model ?? pbrModelUrl;
    emitProgress({ step: PIPELINE_CONFIG.PIPELINE_STEPS.MESH, status: PIPELINE_CONFIG.PIPELINE_STATUSES.SUCCESS, data: { taskId: meshTaskId } });

    await model3dSvc.finalizeModel3D(model.id, model.id, {
      pbrModelSourceUrl: pbrModelUrl,
      modelSourceUrl:    meshModelUrl,
    });

    const finishedModel = await model3dSvc.getModel3D(model.id);
    emitEvent(PIPELINE_CONFIG.PIPELINE_SSE_EVENTS.COMPLETE, {
      model3dId:      model.id,
      gcsPbrModelUrl: finishedModel?.gcsPbrModelUrl,
      gcsModelUrl:    finishedModel?.gcsModelUrl,
    });
  } catch (err) {
    if (model) await model3dSvc.failModel3D(model.id, String(err));
    emitEvent(PIPELINE_CONFIG.PIPELINE_SSE_EVENTS.ERROR, { message: String(err) });
  }
}
