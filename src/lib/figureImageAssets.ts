/**
 * Rich per-image data for figure variants (default + skins).
 * `imageUrls` on imagePrompt remains a denormalized copy of urls for legacy readers.
 */

export type FigureImageAnimStatus = "pending" | "running" | "success" | "failed";

/** One rig/retarget run from a chosen mesh (multiple allowed per mesh). */
export interface FigureImageAnimation {
  id: string;
  createdAt: string;
  status: FigureImageAnimStatus;
  rigTaskId?: string;
  retargetTaskId?: string;
  /** e.g. preset:idle — set when animation pipeline runs */
  animationKey?: string;
  glbUrl?: string;
  error?: string;
}

/** One image→mesh generation (Tripo image_to_model). Multiple per source image. */
export interface FigureImageModel3D {
  id: string;
  createdAt: string;
  status: FigureImageAnimStatus;
  meshTaskId?: string;
  modelUrl?: string;
  pbrModelUrl?: string;
  error?: string;
  animations?: FigureImageAnimation[];
}

export interface FigureImageAsset {
  url: string;
  /** Which mesh is selected for future rig/animate workflows */
  selectedModel3dId?: string | null;
  models3d?: FigureImageModel3D[];
}

export interface NormalizedImagePrompt {
  model?: string;
  prompt?: string;
  negativePrompt?: string;
  imageUrls: string[];
  images: FigureImageAsset[];
}

function emptyModels3d(m?: FigureImageModel3D[]): FigureImageModel3D[] {
  return Array.isArray(m) ? m : [];
}

/** Build `images` from legacy `imageUrls` or existing `images`. */
export function normalizeImagePromptImages(ip: Record<string, unknown> | null | undefined): FigureImageAsset[] {
  if (!ip || typeof ip !== "object") return [];
  const rawImages = ip.images;
  if (Array.isArray(rawImages) && rawImages.length > 0) {
    return rawImages.map((entry: unknown) => {
      if (typeof entry === "string") return { url: entry, models3d: [] };
      const o = entry as Record<string, unknown>;
      const url = typeof o.url === "string" ? o.url : "";
      return {
        url,
        selectedModel3dId: o.selectedModel3dId === undefined ? undefined : (o.selectedModel3dId as string | null),
        models3d: emptyModels3d(o.models3d as FigureImageModel3D[] | undefined),
      };
    });
  }
  const urls = ip.imageUrls;
  if (Array.isArray(urls)) {
    return urls.filter((u): u is string => typeof u === "string").map((url) => ({ url, models3d: [] }));
  }
  return [];
}

/** Ensure imagePrompt written to disk has both `images` and `imageUrls`. */
export function mergeImagesIntoImagePrompt(
  ip: Record<string, unknown> | undefined,
  images: FigureImageAsset[]
): Record<string, unknown> {
  const base = { ...(ip ?? {}) };
  const imageUrls = images.map((i) => i.url).filter(Boolean);
  base.images = images;
  if (imageUrls.length) base.imageUrls = imageUrls;
  else delete base.imageUrls;
  return base;
}
