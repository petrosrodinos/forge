import { Storage, type Bucket } from "@google-cloud/storage";
import { env } from "../../config/env";

const gcsConfigured = Boolean(env.GCS_PROJECT_ID && env.GCS_BUCKET);

export const storage: Storage | null = gcsConfigured
  ? new Storage({
      projectId: env.GCS_PROJECT_ID!,
      keyFilename: env.GCS_KEY_FILE,
    })
  : null;

export const bucket: Bucket | null = storage && env.GCS_BUCKET
  ? storage.bucket(env.GCS_BUCKET)
  : null;

export function requireGcs() {
  if (!env.GCS_BUCKET || !env.GCS_PROJECT_ID || !env.GCS_PUBLIC_BASE_URL) {
    throw new Error(
      "GCS is not configured. Set GCS_BUCKET, GCS_PROJECT_ID, and GCS_PUBLIC_BASE_URL in your .env to enable uploads."
    );
  }
  if (!bucket) {
    throw new Error("GCS bucket client not initialized (missing credentials).");
  }

  return {
    bucket,
    gcsBucket: env.GCS_BUCKET,
    baseUrl: env.GCS_PUBLIC_BASE_URL,
  };
}
