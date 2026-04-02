import { getTripo } from "../../services";
import { extractTripoUploadToken } from "../../integrations/trippo/uploadToken";
import { uploadBuffer } from "../../integrations/gcs/gcs.service";
import * as skinImageSvc from "../skin-images/skin-images.service";
import * as model3dSvc from "../models3d/models3d.service";
import * as animationSvc from "../animations/animations.service";
import type { RunPipelineOpts } from "../../interfaces/pipeline/pipeline.types";
import {
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_POLL_TIMEOUT_MS,
  PIPELINE_DEFAULT_ANIMATIONS,
  PIPELINE_SSE_EVENTS,
  PIPELINE_STEPS,
  PIPELINE_STATUSES,
} from "../../constants/pipeline";
import { TRIPO_OUT_FORMAT_GLb, TRIPO_TASK_TYPES } from "../../constants/tripoTaskTypes";

export async function runPipeline(opts: RunPipelineOpts) {
  const {
    figureId,
    variantId,
    imageBuffer,
    filename,
    mimeType,
    animations = PIPELINE_DEFAULT_ANIMATIONS,
    modelVersion,
    emitProgress,
    emitEvent,
  } = opts;

  let model: Awaited<ReturnType<typeof model3dSvc.createModel3D>> | undefined;
  const tripo = getTripo();

  try {
    // Archive the uploaded image to GCS, then create the SkinImage record.
    const ext = mimeType === "image/jpeg" ? "jpg" : "png";
    const gcsKey = `images/figures/${figureId}/${variantId}/${Date.now()}-source.${ext}`;
    const { gcsUrl } = await uploadBuffer(imageBuffer, gcsKey, mimeType);
    const skinImage = await skinImageSvc.createSkinImage(variantId, figureId, gcsUrl);

    model = await model3dSvc.createModel3D(skinImage.id);

    // ── 1. Upload ────────────────────────────────────────────────────────
    emitProgress({ step: PIPELINE_STEPS.UPLOAD, status: PIPELINE_STATUSES.RUNNING });
    const uploadResult = await tripo.uploadFile(imageBuffer, filename, mimeType);
    const fileToken    = extractTripoUploadToken(uploadResult);
    emitProgress({ step: PIPELINE_STEPS.UPLOAD, status: PIPELINE_STATUSES.SUCCESS });

    // ── 2. Mesh generation ───────────────────────────────────────────────
    emitProgress({ step: PIPELINE_STEPS.MESH, status: PIPELINE_STATUSES.RUNNING });
    const meshTask   = await tripo.createTask({
      type: TRIPO_TASK_TYPES.IMAGE_TO_MODEL,
      file: { type: mimeType === "image/jpeg" ? "jpeg" : "png", file_token: fileToken },
      model_version: modelVersion as never,
      texture: true,
      pbr:     true,
    } as never);
    const meshTaskId = (meshTask.data as any).task_id as string;

    await model3dSvc.updateModel3DProcessing(model.id, { meshTaskId });
    emitProgress({ step: PIPELINE_STEPS.MESH, status: PIPELINE_STATUSES.QUEUED, data: { taskId: meshTaskId } });

    const meshResult   = await tripo.pollTask(meshTaskId, { intervalMs: DEFAULT_POLL_INTERVAL_MS });
    const pbrModelUrl  = meshResult.output?.pbr_model ?? meshResult.output?.model ?? "";
    const meshModelUrl = meshResult.output?.model ?? pbrModelUrl;
    emitProgress({ step: PIPELINE_STEPS.MESH, status: PIPELINE_STATUSES.SUCCESS, data: { taskId: meshTaskId } });

    // ── 3. Pre-rig check ─────────────────────────────────────────────────
    emitProgress({ step: PIPELINE_STEPS.PRERIG, status: PIPELINE_STATUSES.RUNNING });
    const prerigTask   = await tripo.createTask({
      type: TRIPO_TASK_TYPES.ANIMATE_PRERIGCHECK,
      original_model_task_id: meshTaskId,
    } as never);
    const prerigTaskId = (prerigTask.data as any).task_id as string;
    await model3dSvc.updateModel3DProcessing(model.id, { prerigTaskId });

    const prerigResult = await tripo.pollTask(prerigTaskId, { intervalMs: DEFAULT_POLL_INTERVAL_MS });

    if (!prerigResult.output?.riggable) {
      await model3dSvc.finalizeModel3D(model.id, model.id, {
        pbrModelSourceUrl: pbrModelUrl,
        modelSourceUrl:    meshModelUrl,
      });
      emitProgress({ step: PIPELINE_STEPS.PRERIG, status: PIPELINE_STATUSES.FAILED, data: { error: "Model is not riggable" } });
      emitEvent(PIPELINE_SSE_EVENTS.COMPLETE, {
        error: "Not riggable — static model archived to GCS.",
        model3dId: model.id,
      });
      return;
    }
    emitProgress({ step: PIPELINE_STEPS.PRERIG, status: PIPELINE_STATUSES.SUCCESS });

    // ── 4. Rig ───────────────────────────────────────────────────────────
    emitProgress({ step: PIPELINE_STEPS.RIG, status: PIPELINE_STATUSES.RUNNING });
    const rigTask   = await tripo.createTask({
      type: TRIPO_TASK_TYPES.ANIMATE_RIG,
      original_model_task_id: meshTaskId,
      out_format: TRIPO_OUT_FORMAT_GLb,
    } as never);
    const rigTaskId = (rigTask.data as any).task_id as string;
    await model3dSvc.updateModel3DProcessing(model.id, { rigTaskId });
    emitProgress({ step: PIPELINE_STEPS.RIG, status: PIPELINE_STATUSES.QUEUED, data: { taskId: rigTaskId } });

    await tripo.pollTask(rigTaskId, { intervalMs: DEFAULT_POLL_INTERVAL_MS });

    await model3dSvc.finalizeModel3D(model.id, model.id, {
      pbrModelSourceUrl: pbrModelUrl,
      modelSourceUrl:    meshModelUrl,
    });
    emitProgress({ step: PIPELINE_STEPS.RIG, status: PIPELINE_STATUSES.SUCCESS });

    // ── 5. Animate ───────────────────────────────────────────────────────
    const animationResults: Array<{ animationKey: string; gcsGlbUrl: string; status: string }> = [];

    for (const animationKey of animations) {
      emitProgress({ step: PIPELINE_STEPS.ANIMATE, status: PIPELINE_STATUSES.RUNNING, data: { animationKey } });
      const animRecord = await animationSvc.createAnimation(model.id, animationKey);

      try {
        const animTask   = await tripo.createTask({
          type: TRIPO_TASK_TYPES.ANIMATE_RETARGET,
          original_model_task_id: rigTaskId,
          animations:             [animationKey] as never,
          out_format:             TRIPO_OUT_FORMAT_GLb,
          bake_animation:         true,
          export_with_geometry:   true,
        } as never);
        const animTaskId = (animTask.data as any).task_id as string;

        const animResult = await tripo.pollTask(animTaskId, { intervalMs: DEFAULT_POLL_INTERVAL_MS, timeoutMs: DEFAULT_POLL_TIMEOUT_MS });
        const glbUrl     = animResult.output?.model;

        if (!glbUrl) throw new Error("Tripo returned no GLB URL");

        const finalAnim = await animationSvc.finalizeAnimation(animRecord.id, model.id, animationKey, glbUrl);
        animationResults.push({ animationKey, gcsGlbUrl: finalAnim.gcsGlbUrl!, status: PIPELINE_STATUSES.SUCCESS });
        emitProgress({ step: PIPELINE_STEPS.ANIMATE, status: PIPELINE_STATUSES.SUCCESS, data: { animationKey, gcsGlbUrl: finalAnim.gcsGlbUrl } });

      } catch (err) {
        await animationSvc.failAnimation(animRecord.id, String(err));
        animationResults.push({ animationKey, gcsGlbUrl: "", status: PIPELINE_STATUSES.FAILED });
        emitProgress({ step: PIPELINE_STEPS.ANIMATE, status: PIPELINE_STATUSES.FAILED, data: { animationKey, error: String(err) } });
      }
    }

    const finishedModel = await model3dSvc.getModel3D(model.id);
    emitEvent(PIPELINE_SSE_EVENTS.COMPLETE, {
      model3dId:      model.id,
      gcsPbrModelUrl: finishedModel?.gcsPbrModelUrl,
      gcsModelUrl:    finishedModel?.gcsModelUrl,
      animations:     animationResults,
    });
  } catch (err) {
    if (model) await model3dSvc.failModel3D(model.id, String(err));
    emitEvent(PIPELINE_SSE_EVENTS.ERROR, { message: String(err) });
  }
}
