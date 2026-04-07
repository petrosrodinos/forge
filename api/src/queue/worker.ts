import { Worker } from "bullmq";
import { getRedisClient } from "./redis.client";
import { QUEUE_NAMES } from "./queues";
import { processMeshJob } from "./processors/mesh.processor";
import { processRigJob } from "./processors/rig.processor";
import { processAnimateJob } from "./processors/animate.processor";

export function startWorkers() {
  const meshWorker = new Worker(QUEUE_NAMES.MESH, processMeshJob, {
    connection: getRedisClient(),
    concurrency: 5,
  });

  const rigWorker = new Worker(QUEUE_NAMES.RIG, processRigJob, {
    connection: getRedisClient(),
    concurrency: 3,
  });

  const animateWorker = new Worker(QUEUE_NAMES.ANIMATE, processAnimateJob, {
    connection: getRedisClient(),
    concurrency: 3,
  });

  for (const worker of [meshWorker, rigWorker, animateWorker]) {
    worker.on("completed", (job) => {
      console.log(`[worker:${worker.name}] job ${job.id} completed`);
    });
    worker.on("failed", (job, err) => {
      console.error(`[worker:${worker.name}] job ${job?.id} failed:`, err.message);
    });
  }

  console.log("[workers] mesh, rig, animate workers started");

  return [meshWorker, rigWorker, animateWorker];
}

// Allow running as a standalone process: ts-node src/queue/worker.ts
if (require.main === module) {
  import("dotenv/config").then(() => {
    const workers = startWorkers();

    async function shutdown() {
      await Promise.all(workers.map((w) => w.close()));
      process.exit(0);
    }

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  });
}
