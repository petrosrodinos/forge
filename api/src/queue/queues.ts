import { Queue, QueueEvents } from "bullmq";
import { getRedisClient } from "./redis.client";
import type { MeshFromImageJobData, MeshFromImagesJobData, RigJobData, AnimateJobData } from "./job.types";

export const QUEUE_NAMES = {
  MESH: "3d-mesh",
  RIG: "3d-rig",
  ANIMATE: "3d-animate",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

type MeshJobData = MeshFromImageJobData | MeshFromImagesJobData;

// ─── Queue singletons ──────────────────────────────────────────────────────

let meshQueue: Queue<MeshJobData> | null = null;
let rigQueue: Queue<RigJobData> | null = null;
let animateQueue: Queue<AnimateJobData> | null = null;

export function getMeshQueue(): Queue<MeshJobData> {
  if (!meshQueue) {
    meshQueue = new Queue<MeshJobData>(QUEUE_NAMES.MESH, { connection: getRedisClient() });
  }
  return meshQueue;
}

export function getRigQueue(): Queue<RigJobData> {
  if (!rigQueue) {
    rigQueue = new Queue<RigJobData>(QUEUE_NAMES.RIG, { connection: getRedisClient() });
  }
  return rigQueue;
}

export function getAnimateQueue(): Queue<AnimateJobData> {
  if (!animateQueue) {
    animateQueue = new Queue<AnimateJobData>(QUEUE_NAMES.ANIMATE, { connection: getRedisClient() });
  }
  return animateQueue;
}

// ─── QueueEvents singletons (shared pub/sub connections) ──────────────────

let meshQueueEvents: QueueEvents | null = null;
let rigQueueEvents: QueueEvents | null = null;
let animateQueueEvents: QueueEvents | null = null;

export function getMeshQueueEvents(): QueueEvents {
  if (!meshQueueEvents) {
    meshQueueEvents = new QueueEvents(QUEUE_NAMES.MESH, { connection: getRedisClient() });
  }
  return meshQueueEvents;
}

export function getRigQueueEvents(): QueueEvents {
  if (!rigQueueEvents) {
    rigQueueEvents = new QueueEvents(QUEUE_NAMES.RIG, { connection: getRedisClient() });
  }
  return rigQueueEvents;
}

export function getAnimateQueueEvents(): QueueEvents {
  if (!animateQueueEvents) {
    animateQueueEvents = new QueueEvents(QUEUE_NAMES.ANIMATE, { connection: getRedisClient() });
  }
  return animateQueueEvents;
}
