export const PIPELINE_DEFAULT_ANIMATIONS = ["preset:idle"];

export const PIPELINE_SSE_EVENTS = {
  PROGRESS: "progress",
  COMPLETE: "complete",
  ERROR: "error",
} as const;

export const PIPELINE_STEPS = {
  UPLOAD: "upload",
  MESH: "mesh",
  PRERIG: "prerig",
  RIG: "rig",
  ANIMATE: "animate",
} as const;

export const PIPELINE_STATUSES = {
  RUNNING: "running",
  SUCCESS: "success",
  QUEUED: "queued",
  FAILED: "failed",
} as const;

export const DEFAULT_POLL_INTERVAL_MS = 2000;
export const DEFAULT_POLL_TIMEOUT_MS = 600_000;

