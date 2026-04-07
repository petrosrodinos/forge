import { Router } from "express";
import { Job } from "bullmq";
import { z } from "zod";
import { sseHeaders, sseWrite } from "../../lib/sse";
import {
  getMeshQueue,
  getRigQueue,
  getAnimateQueue,
  getMeshQueueEvents,
  getRigQueueEvents,
  getAnimateQueueEvents,
  QUEUE_NAMES,
} from "../../queue/queues";
import type { QueueName } from "../../queue/queues";
import { getJobStatus } from "./jobs.service";
import type { Queue, QueueEvents } from "bullmq";

const router = Router();

const queueSchema = z.object({
  queue: z.enum([QUEUE_NAMES.MESH, QUEUE_NAMES.RIG, QUEUE_NAMES.ANIMATE] as [string, ...string[]]),
});

function getQueuePair(name: QueueName): { queue: Queue; events: QueueEvents } {
  switch (name) {
    case QUEUE_NAMES.MESH: return { queue: getMeshQueue(), events: getMeshQueueEvents() };
    case QUEUE_NAMES.RIG: return { queue: getRigQueue(), events: getRigQueueEvents() };
    case QUEUE_NAMES.ANIMATE: return { queue: getAnimateQueue(), events: getAnimateQueueEvents() };
  }
}

/** GET /api/jobs/:jobId?queue=3d:mesh — poll job status */
router.get("/:jobId", async (req, res, next) => {
  const parsed = queueSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "queue query param is required (3d:mesh | 3d:rig | 3d:animate)" });
    return;
  }

  try {
    const status = await getJobStatus(parsed.data.queue as import("../../queue/queues").QueueName, req.params.jobId);
    if (!status) { res.status(404).json({ error: "Job not found" }); return; }
    res.json(status);
  } catch (err) {
    next(err);
  }
});

/** GET /api/jobs/:jobId/events?queue=3d:rig — SSE stream of job progress */
router.get("/:jobId/events", async (req, res) => {
  const parsed = queueSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "queue query param is required" });
    return;
  }

  const { jobId } = req.params;
  const { queue, events: queueEvents } = getQueuePair(parsed.data.queue as import("../../queue/queues").QueueName);

  const job = await Job.fromId(queue, jobId);
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }

  sseHeaders(res);

  // Resolve immediately if the job already finished before the client connected.
  const currentState = await job.getState();
  if (currentState === "completed") {
    sseWrite(res, "complete", { progress: job.progress });
    res.end();
    return;
  }
  if (currentState === "failed") {
    sseWrite(res, "error", { message: job.failedReason });
    res.end();
    return;
  }

  // ── Subscribe to live events ────────────────────────────────────────────
  const onProgress = ({ jobId: id, data }: { jobId: string; data: unknown }) => {
    if (id !== jobId) return;
    sseWrite(res, "progress", data as Record<string, unknown>);
  };

  const onCompleted = ({ jobId: id, returnvalue }: { jobId: string; returnvalue: string }) => {
    if (id !== jobId) return;
    const data = returnvalue ? tryParse(returnvalue) : {};
    sseWrite(res, "complete", data);
    cleanup();
  };

  const onFailed = ({ jobId: id, failedReason }: { jobId: string; failedReason: string }) => {
    if (id !== jobId) return;
    sseWrite(res, "error", { message: failedReason });
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
});

function tryParse(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export default router;
