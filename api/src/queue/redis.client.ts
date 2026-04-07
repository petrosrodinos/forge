import IORedis from "ioredis";

let client: IORedis | null = null;

/**
 * Returns a shared IORedis connection configured for BullMQ.
 * `maxRetriesPerRequest: null` is required so BullMQ workers and QueueEvents
 * can block indefinitely on commands like BLPOP.
 */
export function getRedisClient(): IORedis {
  if (!client) {
    client = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    });

    client.on("error", (err) => {
      console.error("[redis] connection error:", err.message);
    });
  }
  return client;
}
