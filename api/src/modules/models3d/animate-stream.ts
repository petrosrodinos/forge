import type { Request, Response } from "express";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../integrations/db/client";
import { sseHeaders, sseWrite } from "../../lib/sse";
import { mergeTokenUsageMetadataByIdempotencyKey } from "../tokens/tokens.service";
import { runAnimations } from "./animate.service";
import { TRIPO_JOB_CONFIG } from "../tripo/tripo-job.config";

export function animateTokenUsageIdempotencyKey(model3dId: string, animations: string[]) {
  return `animate:${model3dId}:${[...animations].sort().join("\0")}`;
}

export async function streamModel3dAnimations(
  req: Request,
  res: Response,
  model3dId: string,
  animations: string[],
  tokenUsageIdempotencyKey: string,
) {
  if (!Array.isArray(animations) || animations.length === 0) {
    res.status(400).json({ error: "animations array is required" });
    return;
  }

  const model = await prisma.model3D.findUnique({
    where: { id: model3dId },
    include: { image: { include: { variant: { include: { skin: true } } } } },
  });
  if (!model) {
    res.status(404).json({ error: "Model not found" });
    return;
  }
  if (!model.rigTaskId) {
    res.status(400).json({ error: "Model has not been rigged yet" });
    return;
  }

  const figure = await prisma.figure.findFirst({
    where: { id: model.image.variant.skin.figureId, userId: req.userId },
  });
  if (!figure) {
    res.status(404).json({ error: "Figure not found" });
    return;
  }

  sseHeaders(res);
  const retargetCosts: Array<{ animationKey: string; costsMetadata: Prisma.InputJsonValue }> = [];
  try {
    await runAnimations({
      model3dId,
      rigTaskId: model.rigTaskId,
      animations,
      emitProgress: ({ step, status, data = {} }) => {
        sseWrite(res, TRIPO_JOB_CONFIG.TRIPO_SSE_EVENTS.PROGRESS, { step, status, ...data });
      },
      emitEvent: (event, data) => {
        sseWrite(res, event, data);
      },
      onRetargetTaskCostsMetadata: (payload) => retargetCosts.push(payload),
    });
    if (retargetCosts.length > 0) {
      await mergeTokenUsageMetadataByIdempotencyKey(tokenUsageIdempotencyKey, {
        providerCosts: { trippo: { animateRetargetCreateTasks: retargetCosts } },
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[models3d/animate]", msg);
    sseWrite(res, TRIPO_JOB_CONFIG.TRIPO_SSE_EVENTS.ERROR, { message: msg });
  } finally {
    res.end();
  }
}
