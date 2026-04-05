import type { Request, Response } from "express";
import { prisma } from "../../integrations/db/client";
import { sseHeaders, sseWrite } from "../../lib/sse";
import { runAnimations } from "./animate.service";
import { PIPELINE_CONFIG } from "./config/pipeline.config";

export async function streamAnimatePipeline(
  req: Request,
  res: Response,
  model3dId: string,
  animations: string[],
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
  try {
    await runAnimations({
      model3dId,
      rigTaskId: model.rigTaskId,
      animations,
      emitProgress: ({ step, status, data = {} }) => {
        sseWrite(res, PIPELINE_CONFIG.PIPELINE_SSE_EVENTS.PROGRESS, { step, status, ...data });
      },
      emitEvent: (event, data) => {
        sseWrite(res, event, data);
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[pipeline/animate]", msg);
    sseWrite(res, PIPELINE_CONFIG.PIPELINE_SSE_EVENTS.ERROR, { message: msg });
  } finally {
    res.end();
  }
}
