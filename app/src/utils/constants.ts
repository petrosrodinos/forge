export const APP_NAME = '3d-figures';

/** API origin only (no path). Set `VITE_API_URL` in production when the app and API are on different hosts. */
function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  if (import.meta.env.DEV) return "http://localhost:3000";
  return "";
}

export const API_BASE_URL = resolveApiBaseUrl();
export const MAX_RETRY_COUNT = 3;

export const ANIMATION_PRESETS = [
  { key: "preset:idle",             label: "Idle" },
  { key: "preset:walk",             label: "Walk" },
  { key: "preset:run",              label: "Run" },
  { key: "preset:jump",             label: "Jump" },
  { key: "preset:slash",            label: "Slash" },
  { key: "preset:shoot",            label: "Shoot" },
  { key: "preset:hurt",             label: "Hurt" },
  { key: "preset:fall",             label: "Fall" },
  { key: "preset:dive",             label: "Dive" },
  { key: "preset:climb",            label: "Climb" },
  { key: "preset:quadruped:walk",   label: "Quad Walk" },
  { key: "preset:serpentine:march", label: "Serpentine" },
  { key: "preset:aquatic:march",    label: "Aquatic" },
] as const;

/** Matches api `IMAGES_CONFIG.DEFAULT_AIML_IMAGE_MODEL` when /api/models is unavailable */
export const FALLBACK_IMAGE_MODEL_ID = "flux/schnell";
