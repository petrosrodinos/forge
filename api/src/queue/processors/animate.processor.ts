import type { Job } from "bullmq";
import { getTripo } from "../../services";
import * as animationSvc from "../../modules/animations/animations.service";
import { mergeTokenUsageMetadataByIdempotencyKey } from "../../modules/tokens/tokens.service";
import { TRIPO_JOB_CONFIG } from "../../modules/tripo/tripo-job.config";
import { TRIPO_CONFIG } from "../../modules/tripo/config/tripo.config";
import type { AnimateJobData } from "../job.types";

type AnimationResult = {
  animationKey: string;
  gcsGlbUrl: string;
  status: string;
};

export async function processAnimateJob(
  job: Job<AnimateJobData>,
): Promise<{ animations: AnimationResult[] }> {
  const { model3dId, rigTaskId, animations, tokenUsageIdempotencyKey } = job.data;
  const tripo = getTripo();

  const results: AnimationResult[] = [];
  const retargetCosts: Array<{ animationKey: string; costsMetadata: import("../../generated/prisma/client").Prisma.InputJsonValue }> = [];

  for (const animationKey of animations) {
    await job.updateProgress({
      step: TRIPO_JOB_CONFIG.TRIPO_JOB_STEPS.ANIMATE,
      status: TRIPO_JOB_CONFIG.TRIPO_JOB_STATUSES.RUNNING,
      animationKey,
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
      retargetCosts.push({ animationKey, costsMetadata });

      const animResult = await tripo.pollTask(animTaskId, {
        intervalMs: TRIPO_JOB_CONFIG.DEFAULT_POLL_INTERVAL_MS,
        timeoutMs: TRIPO_JOB_CONFIG.DEFAULT_POLL_TIMEOUT_MS,
      });

      const glbUrl = animResult.output?.model;
      if (!glbUrl) throw new Error("Tripo returned no GLB URL");

      const finalAnim = await animationSvc.finalizeAnimation(animRecord.id, model3dId, animationKey, glbUrl);

      results.push({
        animationKey,
        gcsGlbUrl: finalAnim.gcsGlbUrl!,
        status: TRIPO_JOB_CONFIG.TRIPO_JOB_STATUSES.SUCCESS,
      });

      await job.updateProgress({
        step: TRIPO_JOB_CONFIG.TRIPO_JOB_STEPS.ANIMATE,
        status: TRIPO_JOB_CONFIG.TRIPO_JOB_STATUSES.SUCCESS,
        animationKey,
        gcsGlbUrl: finalAnim.gcsGlbUrl,
      });
    } catch (err) {
      await animationSvc.failAnimation(animRecord.id, String(err));
      results.push({ animationKey, gcsGlbUrl: "", status: TRIPO_JOB_CONFIG.TRIPO_JOB_STATUSES.FAILED });

      await job.updateProgress({
        step: TRIPO_JOB_CONFIG.TRIPO_JOB_STEPS.ANIMATE,
        status: TRIPO_JOB_CONFIG.TRIPO_JOB_STATUSES.FAILED,
        animationKey,
        error: String(err),
      });
    }
  }

  if (retargetCosts.length > 0) {
    await mergeTokenUsageMetadataByIdempotencyKey(tokenUsageIdempotencyKey, {
      providerCosts: { trippo: { animateRetargetCreateTasks: retargetCosts } },
    });
  }

  return { animations: results };
}
