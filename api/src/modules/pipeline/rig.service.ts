import { prisma } from "../../integrations/db/client";
import { getTripo } from "../../services";
import { createPrerigCheck, createRig } from "../tripo/tripo.service";
import * as model3dRepo from "../models3d/repositories/models3d.repository";
import { PIPELINE_CONFIG } from "./config/pipeline.config";
import type { PipelineProgressEmitter, PipelineSseEventEmitter } from "./interfaces/pipeline.types";
import { mergeTokenUsageMetadataByIdempotencyKey } from "../tokens/tokens.service";

export async function runRigPipeline(opts: {
  model3dId: string;
  userId: string;
  emitProgress: PipelineProgressEmitter;
  emitEvent: PipelineSseEventEmitter;
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
  if (!model.meshTaskId) throw new Error("Missing mesh task id — run mesh from the image first");
  if (model.rigTaskId) throw new Error("Model is already rigged");

  const meshTaskId = model.meshTaskId;

  emitProgress({ step: PIPELINE_CONFIG.PIPELINE_STEPS.PRERIG, status: PIPELINE_CONFIG.PIPELINE_STATUSES.RUNNING });
  const { prerigTaskId, costsMetadata: prerigCosts } = await createPrerigCheck(meshTaskId);
  await mergeTokenUsageMetadataByIdempotencyKey(`rig:${model3dId}`, {
    providerCosts: { trippo: { prerigCreateTask: prerigCosts } },
  });
  await model3dRepo.updateModel3DTaskIds(model3dId, { prerigTaskId });
  emitProgress({
    step: PIPELINE_CONFIG.PIPELINE_STEPS.PRERIG,
    status: PIPELINE_CONFIG.PIPELINE_STATUSES.QUEUED,
    data: { taskId: prerigTaskId },
  });

  const prerigResult = await tripo.pollTask(prerigTaskId, {
    intervalMs: PIPELINE_CONFIG.DEFAULT_POLL_INTERVAL_MS,
    timeoutMs: PIPELINE_CONFIG.DEFAULT_POLL_TIMEOUT_MS,
  });
  if (prerigResult.output?.riggable === false) {
    throw new Error("Model is not riggable (pre-rig check failed)");
  }
  emitProgress({ step: PIPELINE_CONFIG.PIPELINE_STEPS.PRERIG, status: PIPELINE_CONFIG.PIPELINE_STATUSES.SUCCESS });

  emitProgress({ step: PIPELINE_CONFIG.PIPELINE_STEPS.RIG, status: PIPELINE_CONFIG.PIPELINE_STATUSES.RUNNING });
  const { rigTaskId, costsMetadata: rigCosts } = await createRig(meshTaskId);
  await mergeTokenUsageMetadataByIdempotencyKey(`rig:${model3dId}`, {
    providerCosts: { trippo: { rigCreateTask: rigCosts } },
  });
  emitProgress({
    step: PIPELINE_CONFIG.PIPELINE_STEPS.RIG,
    status: PIPELINE_CONFIG.PIPELINE_STATUSES.QUEUED,
    data: { taskId: rigTaskId },
  });

  await tripo.pollTask(rigTaskId, {
    intervalMs: PIPELINE_CONFIG.DEFAULT_POLL_INTERVAL_MS,
    timeoutMs: PIPELINE_CONFIG.DEFAULT_POLL_TIMEOUT_MS,
  });

  await model3dRepo.updateModel3DTaskIds(model3dId, { rigTaskId });
  emitProgress({
    step: PIPELINE_CONFIG.PIPELINE_STEPS.RIG,
    status: PIPELINE_CONFIG.PIPELINE_STATUSES.SUCCESS,
    data: { taskId: rigTaskId },
  });

  emitEvent(PIPELINE_CONFIG.PIPELINE_SSE_EVENTS.COMPLETE, { model3dId, rigTaskId });
}
