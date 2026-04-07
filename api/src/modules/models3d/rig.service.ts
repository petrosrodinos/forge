import { prisma } from "../../integrations/db/client";
import { getTripo } from "../../services";
import { createPrerigCheck, createRig } from "../tripo/tripo.service";
import * as model3dRepo from "./repositories/models3d.repository";
import { TRIPO_JOB_CONFIG } from "../tripo/tripo-job.config";
import type { TripoJobProgressEmitter, TripoJobSseEventEmitter } from "./sse-job.types";
import { mergeTokenUsageMetadataByIdempotencyKey } from "../tokens/tokens.service";

export async function runModel3dRig(opts: {
  model3dId: string;
  userId: string;
  emitProgress: TripoJobProgressEmitter;
  emitEvent: TripoJobSseEventEmitter;
}) {
  const { model3dId, userId, emitProgress, emitEvent } = opts;
  const tripo = getTripo();

  const model = await prisma.model3D.findUnique({
    where: { id: model3dId },
    include: { image: { include: { variant: { include: { skin: true } } } } },
  });
  if (!model) throw new Error("Model not found");

  const figure = await prisma.figure.findFirst({
    where: { id: model.image.variant.skin.figureId, userId },
  });
  if (!figure) throw new Error("Figure not found");

  if (model.status !== "success") throw new Error("Model must be ready before rigging");
  if (!model.meshTaskId) throw new Error("Missing mesh task id — complete mesh generation for this model first");
  if (model.rigTaskId) throw new Error("Model is already rigged");

  const meshTaskId = model.meshTaskId;

  emitProgress({
    step: TRIPO_JOB_CONFIG.TRIPO_JOB_STEPS.PRERIG,
    status: TRIPO_JOB_CONFIG.TRIPO_JOB_STATUSES.RUNNING,
  });
  const { prerigTaskId, costsMetadata: prerigCosts } = await createPrerigCheck(meshTaskId);
  await mergeTokenUsageMetadataByIdempotencyKey(`rig:${model3dId}`, {
    providerCosts: { trippo: { prerigCreateTask: prerigCosts } },
  });
  await model3dRepo.updateModel3DTaskIds(model3dId, { prerigTaskId });
  emitProgress({
    step: TRIPO_JOB_CONFIG.TRIPO_JOB_STEPS.PRERIG,
    status: TRIPO_JOB_CONFIG.TRIPO_JOB_STATUSES.QUEUED,
    data: { taskId: prerigTaskId },
  });

  const prerigResult = await tripo.pollTask(prerigTaskId, {
    intervalMs: TRIPO_JOB_CONFIG.DEFAULT_POLL_INTERVAL_MS,
    timeoutMs: TRIPO_JOB_CONFIG.DEFAULT_POLL_TIMEOUT_MS,
  });
  if (prerigResult.output?.riggable === false) {
    throw new Error("Model is not riggable (pre-rig check failed)");
  }
  emitProgress({
    step: TRIPO_JOB_CONFIG.TRIPO_JOB_STEPS.PRERIG,
    status: TRIPO_JOB_CONFIG.TRIPO_JOB_STATUSES.SUCCESS,
  });

  emitProgress({
    step: TRIPO_JOB_CONFIG.TRIPO_JOB_STEPS.RIG,
    status: TRIPO_JOB_CONFIG.TRIPO_JOB_STATUSES.RUNNING,
  });
  const { rigTaskId, costsMetadata: rigCosts } = await createRig(meshTaskId);
  await mergeTokenUsageMetadataByIdempotencyKey(`rig:${model3dId}`, {
    providerCosts: { trippo: { rigCreateTask: rigCosts } },
  });
  emitProgress({
    step: TRIPO_JOB_CONFIG.TRIPO_JOB_STEPS.RIG,
    status: TRIPO_JOB_CONFIG.TRIPO_JOB_STATUSES.QUEUED,
    data: { taskId: rigTaskId },
  });

  await tripo.pollTask(rigTaskId, {
    intervalMs: TRIPO_JOB_CONFIG.DEFAULT_POLL_INTERVAL_MS,
    timeoutMs: TRIPO_JOB_CONFIG.DEFAULT_POLL_TIMEOUT_MS,
  });

  await model3dRepo.updateModel3DTaskIds(model3dId, { rigTaskId });
  emitProgress({
    step: TRIPO_JOB_CONFIG.TRIPO_JOB_STEPS.RIG,
    status: TRIPO_JOB_CONFIG.TRIPO_JOB_STATUSES.SUCCESS,
    data: { taskId: rigTaskId },
  });

  emitEvent(TRIPO_JOB_CONFIG.TRIPO_SSE_EVENTS.COMPLETE, { model3dId, rigTaskId });
}
