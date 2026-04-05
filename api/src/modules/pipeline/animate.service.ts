import type { Prisma } from "../../generated/prisma/client";
import { getTripo } from "../../services";
import * as animationSvc from "../animations/animations.service";
import { PIPELINE_CONFIG } from "./config/pipeline.config";
import { TRIPO_CONFIG } from "../tripo/config/tripo.config";
import type { PipelineProgressEmitter, PipelineSseEventEmitter } from "./interfaces/pipeline.types";

interface RunAnimationsOpts {
  model3dId: string;
  rigTaskId: string;
  animations: string[];
  emitProgress: PipelineProgressEmitter;
  emitEvent: PipelineSseEventEmitter;
  onRetargetTaskCostsMetadata?: (payload: {
    animationKey: string;
    costsMetadata: Prisma.InputJsonValue;
  }) => void;
}

export async function runAnimations(opts: RunAnimationsOpts) {
  const { model3dId, rigTaskId, animations, emitProgress, emitEvent, onRetargetTaskCostsMetadata } = opts;
  const tripo = getTripo();

  const results: Array<{ animationKey: string; gcsGlbUrl: string; status: string }> = [];

  for (const animationKey of animations) {
    emitProgress({
      step: PIPELINE_CONFIG.PIPELINE_STEPS.ANIMATE,
      status: PIPELINE_CONFIG.PIPELINE_STATUSES.RUNNING,
      data: { animationKey },
    });

    const animRecord = await animationSvc.createAnimation(model3dId, animationKey);

    try {
      const { createTaskResponse: animTask, costsMetadata } = await tripo.createTask({
        type: TRIPO_CONFIG.TRIPO_TASK_TYPES.ANIMATE_RETARGET,
        original_model_task_id: rigTaskId,
        animations: [animationKey] as never,
        out_format: TRIPO_CONFIG.TRIPO_OUT_FORMAT_GLb,
        bake_animation: true,
        export_with_geometry: true,
      } as never);
      const animTaskId = (animTask.data as { task_id?: string }).task_id as string;
      onRetargetTaskCostsMetadata?.({ animationKey, costsMetadata });

      const animResult = await tripo.pollTask(animTaskId, {
        intervalMs: PIPELINE_CONFIG.DEFAULT_POLL_INTERVAL_MS,
        timeoutMs: PIPELINE_CONFIG.DEFAULT_POLL_TIMEOUT_MS,
      });
      const glbUrl = animResult.output?.model;
      if (!glbUrl) throw new Error("Tripo returned no GLB URL");

      const finalAnim = await animationSvc.finalizeAnimation(animRecord.id, model3dId, animationKey, glbUrl);
      results.push({ animationKey, gcsGlbUrl: finalAnim.gcsGlbUrl!, status: PIPELINE_CONFIG.PIPELINE_STATUSES.SUCCESS });
      emitProgress({
        step: PIPELINE_CONFIG.PIPELINE_STEPS.ANIMATE,
        status: PIPELINE_CONFIG.PIPELINE_STATUSES.SUCCESS,
        data: { animationKey, gcsGlbUrl: finalAnim.gcsGlbUrl },
      });
    } catch (err) {
      await animationSvc.failAnimation(animRecord.id, String(err));
      results.push({ animationKey, gcsGlbUrl: "", status: PIPELINE_CONFIG.PIPELINE_STATUSES.FAILED });
      emitProgress({
        step: PIPELINE_CONFIG.PIPELINE_STEPS.ANIMATE,
        status: PIPELINE_CONFIG.PIPELINE_STATUSES.FAILED,
        data: { animationKey, error: String(err) },
      });
    }
  }

  emitEvent(PIPELINE_CONFIG.PIPELINE_SSE_EVENTS.COMPLETE, { animations: results });
}
