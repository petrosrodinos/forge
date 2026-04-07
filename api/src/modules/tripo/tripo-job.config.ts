/** Shared SSE + polling defaults for Tripo-backed model jobs (rig, animate, generate-and-mesh). */
export const TRIPO_JOB_CONFIG = {
  TRIPO_DEFAULT_ANIMATIONS: ["preset:idle"],

  TRIPO_SSE_EVENTS: {
    PROGRESS: "progress",
    COMPLETE: "complete",
    ERROR: "error",
  } as const,

  TRIPO_JOB_STEPS: {
    UPLOAD: "upload",
    MESH: "mesh",
    PRERIG: "prerig",
    RIG: "rig",
    ANIMATE: "animate",
  } as const,

  TRIPO_JOB_STATUSES: {
    RUNNING: "running",
    SUCCESS: "success",
    QUEUED: "queued",
    FAILED: "failed",
  } as const,

  DEFAULT_POLL_INTERVAL_MS: 2000,
  MESH_POLL_TIMEOUT_MS: 900_000,
  DEFAULT_POLL_TIMEOUT_MS: 600_000,
} as const;
