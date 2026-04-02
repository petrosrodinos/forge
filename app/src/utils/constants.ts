export const APP_NAME = '3d-figures';
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';
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

export const IMAGE_MODELS = [
  { id: "flux-pro/v1.1-ultra",                      label: "FLUX Pro v1.1 Ultra" },
  { id: "flux-pro/v1.1",                            label: "FLUX Pro v1.1" },
  { id: "flux-pro",                                 label: "FLUX Pro" },
  { id: "flux/dev",                                 label: "FLUX Dev" },
  { id: "flux/schnell",                             label: "FLUX Schnell" },
  { id: "blackforestlabs/flux-2-max",               label: "BFL FLUX 2 Max" },
  { id: "blackforestlabs/flux-2-pro",               label: "BFL FLUX 2 Pro" },
  { id: "blackforestlabs/flux-2",                   label: "BFL FLUX 2" },
  { id: "alibaba/qwen-image",                       label: "Alibaba Qwen Image" },
  { id: "dall-e-3",                                 label: "DALL-E 3" },
  { id: "openai/gpt-image-1",                       label: "GPT Image 1" },
  { id: "recraft-v3",                               label: "Recraft v3" },
  { id: "stable-diffusion-v35-large",               label: "SD v3.5 Large" },
  { id: "google/imagen-4.0-generate-001",           label: "Imagen 4" },
] as const;

export const PIPELINE_STEPS = [
  { id: "upload",  label: "Upload Image",  icon: "↑" },
  { id: "mesh",    label: "Generate Mesh", icon: "⬡" },
  { id: "prerig",  label: "Pre-rig Check", icon: "⊡" },
  { id: "rig",     label: "Rigging",       icon: "⊕" },
  { id: "animate", label: "Animation",     icon: "▷" },
] as const;
