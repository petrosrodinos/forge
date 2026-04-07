import { Job } from "bullmq";
import { getMeshQueue, getRigQueue, getAnimateQueue, QUEUE_NAMES } from "../../queue/queues";
import type { QueueName } from "../../queue/queues";
import type { JobStatus } from "./jobs.types";
import type { Queue } from "bullmq";

function queueByName(name: QueueName): Queue {
  switch (name) {
    case QUEUE_NAMES.MESH: return getMeshQueue();
    case QUEUE_NAMES.RIG: return getRigQueue();
    case QUEUE_NAMES.ANIMATE: return getAnimateQueue();
  }
}

export async function getJobStatus(queueName: QueueName, jobId: string): Promise<JobStatus | null> {
  const queue = queueByName(queueName);
  const job = await Job.fromId(queue, jobId);
  if (!job) return null;

  const state = await job.getState();
  return {
    jobId: job.id!,
    queue: queueName,
    name: job.name,
    state,
    progress: job.progress as number | object,
    failedReason: job.failedReason ?? undefined,
  };
}
