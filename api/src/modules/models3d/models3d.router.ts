import { Router } from "express";
import { z } from "zod";
import { Job } from "bullmq";
import { requireTokens } from "../../middleware/requireTokens";
import { sseHeaders, sseWrite } from "../../lib/sse";
import { TRIPO_JOB_CONFIG } from "../tripo/tripo-job.config";
import {
  getMeshQueue, getRigQueue, getAnimateQueue,
  getMeshQueueEvents, getRigQueueEvents, getAnimateQueueEvents,
} from "../../queue/queues";
import { JOB_NAMES } from "../../queue/job.types";
import * as models3dSvc from "./models3d.service";
import type { Request, Response } from "express";
import type { QueueEvents, Queue } from "bullmq";

const router = Router({ mergeParams: true });

// ─── Param schemas ────────────────────────────────────────────────────────────

const imageIdSchema = z.string().min(1);
const model3dIdSchema = z.string().min(1);
const imageIdsBodySchema = z.object({
  imageIds: z.array(z.string().min(1)).min(2).max(4),
});
const animationsBodySchema = z.object({
  animations: z.array(z.string().min(1)).min(1),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function model3dIdParam(req: { params: Record<string, string | string[]> }): string {
  const raw = req.params.model3dId;
  if (Array.isArray(raw)) return raw[0] ?? "";
  return typeof raw === "string" ? raw : "";
}

function animateIdemKey(model3dId: string, animations: string[]) {
  return `animate:${model3dId}:${[...animations].sort().join("\0")}`;
}

function tryParse(value: string): Record<string, unknown> {
  try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
}

/**
 * Enqueues a job then immediately opens an SSE stream that forwards BullMQ
 * progress / complete / failed events to the client.
 *
 * This keeps the frontend's existing SSE contract while moving all heavy work
 * into background workers (non-blocking for the HTTP server).
 */
async function enqueueAndStream(opts: {
  req: Request;
  res: Response;
  queue: Queue;
  queueEvents: QueueEvents;
  jobName: string;
  jobId: string;
  jobData: object;
}) {
  const { req, res, queue, queueEvents, jobName, jobId, jobData } = opts;

  const job = await queue.add(jobName, jobData, { jobId });

  sseHeaders(res);

  // Edge case: worker picked it up and finished before we subscribed.
  const existing = await Job.fromId(queue, job.id!);
  const currentState = await existing?.getState();

  if (currentState === "completed") {
    sseWrite(res, TRIPO_JOB_CONFIG.TRIPO_SSE_EVENTS.COMPLETE, tryParse(String(existing?.returnvalue ?? "")));
    res.end();
    return;
  }
  if (currentState === "failed") {
    sseWrite(res, TRIPO_JOB_CONFIG.TRIPO_SSE_EVENTS.ERROR, { message: existing?.failedReason });
    res.end();
    return;
  }

  // Forward live events for this specific job.
  const onProgress = ({ jobId: id, data }: { jobId: string; data: unknown }) => {
    if (id !== job.id) return;
    sseWrite(res, TRIPO_JOB_CONFIG.TRIPO_SSE_EVENTS.PROGRESS, data as Record<string, unknown>);
  };

  const onCompleted = ({ jobId: id, returnvalue }: { jobId: string; returnvalue: string }) => {
    if (id !== job.id) return;
    sseWrite(res, TRIPO_JOB_CONFIG.TRIPO_SSE_EVENTS.COMPLETE, tryParse(returnvalue));
    cleanup();
  };

  const onFailed = ({ jobId: id, failedReason }: { jobId: string; failedReason: string }) => {
    if (id !== job.id) return;
    sseWrite(res, TRIPO_JOB_CONFIG.TRIPO_SSE_EVENTS.ERROR, { message: failedReason });
    cleanup();
  };

  const cleanup = () => {
    queueEvents.off("progress", onProgress);
    queueEvents.off("completed", onCompleted);
    queueEvents.off("failed", onFailed);
    if (!res.writableEnded) res.end();
  };

  queueEvents.on("progress", onProgress);
  queueEvents.on("completed", onCompleted);
  queueEvents.on("failed", onFailed);

  req.on("close", cleanup);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/models3d/from-image/:imageId
 * SSE stream: progress → complete (with model data) | error
 */
router.post(
  "/from-image/:imageId",
  requireTokens("trippoMesh", (req) => {
    const imageId = req.params.imageId;
    if (Array.isArray(imageId)) return imageId[0] ? `mesh:${imageId[0]}` : undefined;
    return typeof imageId === "string" && imageId ? `mesh:${imageId}` : undefined;
  }),
  async (req, res) => {
    const parsedId = imageIdSchema.safeParse(req.params.imageId);
    if (!parsedId.success) {
      res.status(400).json({ error: "imageId is required" });
      return;
    }

    const imageId = parsedId.data;

    try {
      const model = await models3dSvc.initModel3DFromImage({ imageId, userId: req.userId });
      await enqueueAndStream({
        req, res,
        queue: getMeshQueue(),
        queueEvents: getMeshQueueEvents(),
        jobName: JOB_NAMES.MESH_FROM_IMAGE,
        jobId: `mesh-img-${model.id}`,
        jobData: { model3dId: model.id, imageId, userId: req.userId, tokenUsageIdempotencyKey: `mesh:${imageId}` },
      });
    } catch (err) {
      const status = (err as Error & { status?: number }).status ?? 500;
      res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
    }
  },
);

/**
 * POST /api/models3d/from-images
 * SSE stream: progress → complete (with model data) | error
 */
router.post(
  "/from-images",
  requireTokens("trippoMesh", (req) => {
    const imageIds = (req.body as { imageIds?: string[] }).imageIds;
    if (!Array.isArray(imageIds) || imageIds.length === 0) return undefined;
    return `mesh-multiview:${[...imageIds].sort().join(",")}`;
  }),
  async (req, res) => {
    const parsed = imageIdsBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "imageIds must be an array of 2 to 4 non-empty strings" });
      return;
    }

    const { imageIds } = parsed.data;
    const idemKey = `mesh-multiview:${[...imageIds].sort().join(",")}`;

    try {
      const model = await models3dSvc.initModel3DFromImages({ imageIds, userId: req.userId });
      await enqueueAndStream({
        req, res,
        queue: getMeshQueue(),
        queueEvents: getMeshQueueEvents(),
        jobName: JOB_NAMES.MESH_FROM_IMAGES,
        jobId: `mesh-imgs-${model.id}`,
        jobData: { model3dId: model.id, imageIds, userId: req.userId, tokenUsageIdempotencyKey: idemKey },
      });
    } catch (err) {
      const status = (err as Error & { status?: number }).status ?? 500;
      res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
    }
  },
);

/**
 * POST /api/models3d/:model3dId/rig
 * SSE stream: prerig/rig progress → complete | error
 */
router.post(
  "/:model3dId/rig",
  requireTokens("rig", (req) => {
    const id = model3dIdParam(req);
    return id ? `rig:${id}` : undefined;
  }),
  async (req, res) => {
    const parsedId = model3dIdSchema.safeParse(model3dIdParam(req));
    if (!parsedId.success) {
      res.status(400).json({ error: "model3dId is required" });
      return;
    }

    const model3dId = parsedId.data;

    try {
      const model = await models3dSvc.getModel3D(model3dId);
      if (!model) { res.status(404).json({ error: "Model not found" }); return; }
      if (model.status !== "success") { res.status(400).json({ error: "Model must be ready before rigging" }); return; }
      if (!model.meshTaskId) { res.status(400).json({ error: "Missing mesh task id" }); return; }
      if (model.rigTaskId) { res.status(409).json({ error: "Model is already rigged" }); return; }

      await enqueueAndStream({
        req, res,
        queue: getRigQueue(),
        queueEvents: getRigQueueEvents(),
        jobName: JOB_NAMES.RIG,
        jobId: `rig-${model3dId}`,
        jobData: { model3dId, userId: req.userId, tokenUsageIdempotencyKey: `rig:${model3dId}` },
      });
    } catch (err) {
      const status = (err as Error & { status?: number }).status ?? 500;
      res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
    }
  },
);

/**
 * POST /api/models3d/:model3dId/animate
 * SSE stream: per-animation progress → complete | error
 */
router.post(
  "/:model3dId/animate",
  requireTokens("animationRetarget", (req) => {
    const id = model3dIdParam(req);
    const animations = (req.body as { animations?: string[] }).animations;
    if (!id || !Array.isArray(animations) || animations.length === 0) return undefined;
    return animateIdemKey(id, animations);
  }),
  async (req, res) => {
    const parsedId = model3dIdSchema.safeParse(model3dIdParam(req));
    if (!parsedId.success) {
      res.status(400).json({ error: "model3dId is required" });
      return;
    }

    const parsedBody = animationsBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ error: "animations must be a non-empty array of strings" });
      return;
    }

    const model3dId = parsedId.data;
    const { animations } = parsedBody.data;

    try {
      const model = await models3dSvc.getModel3D(model3dId);
      if (!model) { res.status(404).json({ error: "Model not found" }); return; }
      if (!model.rigTaskId) { res.status(400).json({ error: "Model has not been rigged yet" }); return; }

      const idemKey = animateIdemKey(model3dId, animations);
      await enqueueAndStream({
        req, res,
        queue: getAnimateQueue(),
        queueEvents: getAnimateQueueEvents(),
        jobName: JOB_NAMES.ANIMATE,
        jobId: `animate-${model3dId}-${Date.now()}`,
        jobData: { model3dId, rigTaskId: model.rigTaskId, animations, userId: req.userId, tokenUsageIdempotencyKey: idemKey },
      });
    } catch (err) {
      const status = (err as Error & { status?: number }).status ?? 500;
      res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
    }
  },
);

/** GET /api/models3d/:model3dId */
router.get("/:model3dId", async (req, res, next) => {
  try {
    const m = await models3dSvc.getModel3D(req.params.model3dId);
    if (!m) return res.status(404).json({ error: "Model not found" });
    res.json(m);
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/models3d/:model3dId */
router.delete("/:model3dId", async (req, res, next) => {
  try {
    await models3dSvc.deleteModel3D(req.params.model3dId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
