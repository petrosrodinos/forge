import type { Job } from "bullmq";
import { prisma } from "../../integrations/db/client";
import { getTripo } from "../../services";
import { createPrerigCheck, createRig } from "../../modules/tripo/tripo.service";
import { updateModel3DTaskIds } from "../../modules/models3d/repositories/models3d.repository";
import { mergeTokenUsageMetadataByIdempotencyKey } from "../../modules/tokens/tokens.service";
import { TRIPO_JOB_CONFIG } from "../../modules/tripo/tripo-job.config";
import type { RigJobData } from "../job.types";

export async function processRigJob(job: Job<RigJobData>): Promise<{ model3dId: string; rigTaskId: string }> {
  const { model3dId, tokenUsageIdempotencyKey } = job.data;
  const tripo = getTripo();

  const model = await prisma.model3D.findUnique({ where: { id: model3dId } });
  if (!model) throw new Error("Model not found");
  if (model.status !== "success") throw new Error("Model must be ready before rigging");
  if (!model.meshTaskId) throw new Error("Missing mesh task id");
  if (model.rigTaskId) throw new Error("Model is already rigged");

  const { meshTaskId } = model;

  await job.updateProgress({
    step: TRIPO_JOB_CONFIG.TRIPO_JOB_STEPS.PRERIG,
    status: TRIPO_JOB_CONFIG.TRIPO_JOB_STATUSES.RUNNING,
  });

  const { prerigTaskId, costsMetadata: prerigCosts } = await createPrerigCheck(meshTaskId);
  await mergeTokenUsageMetadataByIdempotencyKey(tokenUsageIdempotencyKey, {
    providerCosts: { trippo: { prerigCreateTask: prerigCosts } },
  });
  await updateModel3DTaskIds(model3dId, { prerigTaskId });

  await job.updateProgress({
    step: TRIPO_JOB_CONFIG.TRIPO_JOB_STEPS.PRERIG,
    status: TRIPO_JOB_CONFIG.TRIPO_JOB_STATUSES.QUEUED,
    taskId: prerigTaskId,
  });

  const prerigResult = await tripo.pollTask(prerigTaskId, {
    intervalMs: TRIPO_JOB_CONFIG.DEFAULT_POLL_INTERVAL_MS,
    timeoutMs: TRIPO_JOB_CONFIG.DEFAULT_POLL_TIMEOUT_MS,
  });

  if (prerigResult.output?.riggable === false) {
    throw new Error("Model is not riggable (pre-rig check failed)");
  }

  await job.updateProgress({
    step: TRIPO_JOB_CONFIG.TRIPO_JOB_STEPS.PRERIG,
    status: TRIPO_JOB_CONFIG.TRIPO_JOB_STATUSES.SUCCESS,
  });

  await job.updateProgress({
    step: TRIPO_JOB_CONFIG.TRIPO_JOB_STEPS.RIG,
    status: TRIPO_JOB_CONFIG.TRIPO_JOB_STATUSES.RUNNING,
  });

  const { rigTaskId, costsMetadata: rigCosts } = await createRig(meshTaskId);
  await mergeTokenUsageMetadataByIdempotencyKey(tokenUsageIdempotencyKey, {
    providerCosts: { trippo: { rigCreateTask: rigCosts } },
  });

  await job.updateProgress({
    step: TRIPO_JOB_CONFIG.TRIPO_JOB_STEPS.RIG,
    status: TRIPO_JOB_CONFIG.TRIPO_JOB_STATUSES.QUEUED,
    taskId: rigTaskId,
  });

  await tripo.pollTask(rigTaskId, {
    intervalMs: TRIPO_JOB_CONFIG.DEFAULT_POLL_INTERVAL_MS,
    timeoutMs: TRIPO_JOB_CONFIG.DEFAULT_POLL_TIMEOUT_MS,
  });

  await updateModel3DTaskIds(model3dId, { rigTaskId });

  await job.updateProgress({
    step: TRIPO_JOB_CONFIG.TRIPO_JOB_STEPS.RIG,
    status: TRIPO_JOB_CONFIG.TRIPO_JOB_STATUSES.SUCCESS,
    taskId: rigTaskId,
  });

  return { model3dId, rigTaskId };
}
