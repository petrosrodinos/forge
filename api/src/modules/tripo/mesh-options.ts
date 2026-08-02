import { z } from "zod";
import type { ModelVersion } from "../../integrations/trippo/types";
import {
  quoteTrippoGenerationCredits,
  quoteTrippoGenerationWalletTokens,
  type TrippoGenerationAddonId,
  type TrippoGenerationTask,
  type TrippoHTextureTier,
  type TrippoPTextureTier,
} from "../../config/models/trippo-models";

export const TRIPPO_MESH_MODEL_VERSIONS = [
  "v3.1-20260211",
  "v3.0-20250812",
  "v2.5-20250123",
  "P1-20260311",
] as const satisfies readonly ModelVersion[];

export type TrippoMeshModelVersion = (typeof TRIPPO_MESH_MODEL_VERSIONS)[number];

export const TEXTURE_QUALITY_VALUES = ["standard", "detailed", "extreme"] as const;
export const GEOMETRY_QUALITY_VALUES = ["standard", "detailed"] as const;

export const meshOptionsSchema = z.object({
  model: z.enum(TRIPPO_MESH_MODEL_VERSIONS).optional(),
  texture: z.boolean().optional(),
  pbr: z.boolean().optional(),
  textureQuality: z.enum(TEXTURE_QUALITY_VALUES).optional(),
  geometryQuality: z.enum(GEOMETRY_QUALITY_VALUES).optional(),
  faceLimit: z.number().int().positive().optional(),
  orientation: z.enum(["default", "align_image"]).optional(),
  textureAlignment: z.enum(["original_image", "geometry"]).optional(),
});

export type MeshOptionsInput = z.infer<typeof meshOptionsSchema>;

export type ResolvedMeshOptions = {
  model: TrippoMeshModelVersion;
  texture: boolean;
  pbr: boolean;
  textureQuality: (typeof TEXTURE_QUALITY_VALUES)[number];
  geometryQuality: (typeof GEOMETRY_QUALITY_VALUES)[number];
  faceLimit?: number;
  orientation: "default" | "align_image";
  textureAlignment: "original_image" | "geometry";
};

export const MULTIVIEW_SLOT_KEYS = ["front", "left", "back", "right"] as const;
export type MultiviewSlotKey = (typeof MULTIVIEW_SLOT_KEYS)[number];

export function isPSeriesModel(model: string): boolean {
  return model.startsWith("P");
}

export function resolveMeshOptions(input?: MeshOptionsInput | null): ResolvedMeshOptions {
  const model = (input?.model ?? "v3.1-20260211") as TrippoMeshModelVersion;
  const pSeries = isPSeriesModel(model);
  const texture = input?.texture ?? true;
  const pbr = input?.pbr ?? true;
  let textureQuality = input?.textureQuality ?? "standard";
  let geometryQuality = input?.geometryQuality ?? "standard";

  if (pSeries) {
    geometryQuality = "standard";
    if (textureQuality === "extreme") textureQuality = "detailed";
  }
  if (model === "v2.5-20250123") {
    geometryQuality = "standard";
  }

  return {
    model,
    texture,
    pbr: pbr ? true : false,
    textureQuality,
    geometryQuality,
    faceLimit: input?.faceLimit,
    orientation: input?.orientation ?? "default",
    textureAlignment: input?.textureAlignment ?? "original_image",
  };
}

export function meshOptionsToCreateFields(opts: ResolvedMeshOptions): Record<string, unknown> {
  const pSeries = isPSeriesModel(opts.model);
  const fields: Record<string, unknown> = {
    model: opts.model,
    model_version: opts.model,
    texture: opts.texture,
    pbr: opts.pbr,
    texture_quality: opts.textureQuality,
    texture_alignment: opts.textureAlignment,
    orientation: opts.orientation,
  };

  if (opts.faceLimit != null) fields.face_limit = opts.faceLimit;

  if (!pSeries && opts.model !== "v2.5-20250123" && opts.geometryQuality === "detailed") {
    fields.geometry_quality = "detailed";
  }

  if (pSeries) {
    delete fields.geometry_quality;
  }

  return fields;
}

export function quoteMeshGeneration(task: TrippoGenerationTask, opts: ResolvedMeshOptions): {
  credits: number;
  walletTokens: number;
} {
  if (isPSeriesModel(opts.model)) {
    let texture: TrippoPTextureTier = "standard";
    if (!opts.texture) texture = "none";
    else if (opts.textureQuality === "detailed" || opts.textureQuality === "extreme") texture = "detailed";
    const credits = quoteTrippoGenerationCredits({ series: "p", task, texture });
    return { credits, walletTokens: quoteTrippoGenerationWalletTokens({ series: "p", task, texture }) };
  }

  const texture: TrippoHTextureTier = opts.texture ? "standard" : "none";
  const addons: TrippoGenerationAddonId[] = [];
  if (opts.geometryQuality === "detailed" && opts.model !== "v2.5-20250123") {
    addons.push("geometry_hd");
  }
  const input = {
    series: "h" as const,
    task,
    texture,
    textureQuality: opts.texture ? opts.textureQuality : undefined,
    addons,
  };
  return {
    credits: quoteTrippoGenerationCredits(input),
    walletTokens: quoteTrippoGenerationWalletTokens(input),
  };
}

export const TRIPPO_MESH_MODEL_CATALOG = TRIPPO_MESH_MODEL_VERSIONS.map((model) => {
  const series = isPSeriesModel(model) ? ("p" as const) : ("h" as const);
  const labelByModel: Record<TrippoMeshModelVersion, string> = {
    "v3.1-20260211": "H 3.1 — Best quality",
    "v3.0-20250812": "H 3.0 — Advanced",
    "v2.5-20250123": "H 2.5 — Balanced",
    "P1-20260311": "P1 — Low-poly",
  };
  const baseImage = resolveMeshOptions({ model });
  const baseMulti = resolveMeshOptions({ model });
  return {
    id: model,
    model,
    series,
    label: labelByModel[model],
    supportsGeometryQuality: series === "h" && model !== "v2.5-20250123",
    supportsTextureExtreme: series === "h",
    imageToModelTokens: quoteMeshGeneration("image_to_model", baseImage).walletTokens,
    multiviewToModelTokens: quoteMeshGeneration("multiview_to_model", baseMulti).walletTokens,
  };
});
