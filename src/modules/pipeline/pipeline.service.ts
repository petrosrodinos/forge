import type { Response } from "express";
import { getTripo } from "../../services";
import { sseWrite } from "../../lib/sse";
import { extractTripoUploadToken } from "../../integrations/trippo/uploadToken";
import * as model3dSvc   from "../models3d/models3d.service";
import * as animationSvc from "../animations/animations.service";

interface RunPipelineOpts {
  imageId:     string;
  figureId:    string;
  imageBuffer: Buffer;
  filename:    string;
  mimeType:    "image/png" | "image/jpeg";
  animations:  string[];
  modelVersion: string;
  res:         Response;
}

function emit(res: Response, step: string, status: string, data: Record<string, unknown> = {}) {
  sseWrite(res, "progress", { step, status, ...data });
}

export async function runPipeline(opts: RunPipelineOpts) {
  const { imageId, figureId: _figureId, imageBuffer, filename, mimeType, animations, modelVersion, res } = opts;
  const tripo = getTripo();

  const model = await model3dSvc.createModel3D(imageId);

  try {
    // ── 1. Upload ────────────────────────────────────────────────────────
    emit(res, "upload", "running");
    const uploadResult = await tripo.uploadFile(imageBuffer, filename, mimeType);
    const fileToken    = extractTripoUploadToken(uploadResult);
    emit(res, "upload", "success");

    // ── 2. Mesh generation ───────────────────────────────────────────────
    emit(res, "mesh", "running");
    const meshTask   = await tripo.createTask({
      type: "image_to_model",
      file: { type: mimeType === "image/jpeg" ? "jpeg" : "png", file_token: fileToken },
      model_version: modelVersion as never,
      texture: true,
      pbr:     true,
    } as never);
    const meshTaskId = (meshTask.data as any).task_id as string;

    await model3dSvc.updateModel3DProcessing(model.id, { meshTaskId });
    emit(res, "mesh", "queued", { taskId: meshTaskId });

    const meshResult   = await tripo.pollTask(meshTaskId, { intervalMs: 2000 });
    const pbrModelUrl  = meshResult.output?.pbr_model ?? meshResult.output?.model ?? "";
    const meshModelUrl = meshResult.output?.model ?? pbrModelUrl;
    emit(res, "mesh", "success", { taskId: meshTaskId });

    // ── 3. Pre-rig check ─────────────────────────────────────────────────
    emit(res, "prerig", "running");
    const prerigTask   = await tripo.createTask({
      type: "animate_prerigcheck", original_model_task_id: meshTaskId,
    } as never);
    const prerigTaskId = (prerigTask.data as any).task_id as string;
    await model3dSvc.updateModel3DProcessing(model.id, { prerigTaskId });

    const prerigResult = await tripo.pollTask(prerigTaskId, { intervalMs: 2000 });

    if (!prerigResult.output?.riggable) {
      await model3dSvc.finalizeModel3D(model.id, model.id, {
        pbrModelSourceUrl: pbrModelUrl,
        modelSourceUrl:    meshModelUrl,
      });
      emit(res, "prerig", "failed", { error: "Model is not riggable" });
      sseWrite(res, "complete", { error: "Not riggable — static model archived to GCS.", model3dId: model.id });
      return;
    }
    emit(res, "prerig", "success");

    // ── 4. Rig ───────────────────────────────────────────────────────────
    emit(res, "rig", "running");
    const rigTask   = await tripo.createTask({
      type: "animate_rig", original_model_task_id: meshTaskId, out_format: "glb",
    } as never);
    const rigTaskId = (rigTask.data as any).task_id as string;
    await model3dSvc.updateModel3DProcessing(model.id, { rigTaskId });
    emit(res, "rig", "queued", { taskId: rigTaskId });

    await tripo.pollTask(rigTaskId, { intervalMs: 2000 });

    await model3dSvc.finalizeModel3D(model.id, model.id, {
      pbrModelSourceUrl: pbrModelUrl,
      modelSourceUrl:    meshModelUrl,
    });
    emit(res, "rig", "success");

    // ── 5. Animate ───────────────────────────────────────────────────────
    const animationResults: Array<{ animationKey: string; gcsGlbUrl: string; status: string }> = [];

    for (const animationKey of animations) {
      emit(res, "animate", "running", { animationKey });
      const animRecord = await animationSvc.createAnimation(model.id, animationKey);

      try {
        const animTask   = await tripo.createTask({
          type: "animate_retarget",
          original_model_task_id: rigTaskId,
          animations:             [animationKey] as never,
          out_format:             "glb",
          bake_animation:         true,
          export_with_geometry:   true,
        } as never);
        const animTaskId = (animTask.data as any).task_id as string;

        const animResult = await tripo.pollTask(animTaskId, { intervalMs: 2000, timeoutMs: 600_000 });
        const glbUrl     = animResult.output?.model;

        if (!glbUrl) throw new Error("Tripo returned no GLB URL");

        const finalAnim = await animationSvc.finalizeAnimation(animRecord.id, model.id, animationKey, glbUrl);
        animationResults.push({ animationKey, gcsGlbUrl: finalAnim.gcsGlbUrl!, status: "success" });
        emit(res, "animate", "success", { animationKey, gcsGlbUrl: finalAnim.gcsGlbUrl });

      } catch (err) {
        await animationSvc.failAnimation(animRecord.id, String(err));
        animationResults.push({ animationKey, gcsGlbUrl: "", status: "failed" });
        emit(res, "animate", "failed", { animationKey, error: String(err) });
      }
    }

    const finishedModel = await model3dSvc.getModel3D(model.id);
    sseWrite(res, "complete", {
      model3dId:      model.id,
      gcsPbrModelUrl: finishedModel?.gcsPbrModelUrl,
      gcsModelUrl:    finishedModel?.gcsModelUrl,
      animations:     animationResults,
    });

  } catch (err) {
    await model3dSvc.failModel3D(model.id, String(err));
    sseWrite(res, "error", { message: String(err) });
  }
}
