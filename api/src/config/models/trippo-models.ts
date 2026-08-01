import { trippoProviderCreditsToEur } from "../../lib/models-cost";
import { MARKUP_FACTOR } from "./pricing";

export type TrippoSeries = "h" | "p";

export type TrippoGenerationTask = "text_to_model" | "image_to_model" | "multiview_to_model";

export type TrippoHTextureTier = "none" | "standard";

export type TrippoPTextureTier = "none" | "standard" | "detailed";

export type TrippoGenerationAddonId =
  | "texture_hd"
  | "texture_8k_ultra"
  | "geometry_hd"
  | "quad"
  | "smart_low_poly"
  | "generate_parts";

export type TrippoImageSizeTier = "1k" | "2k" | "4k";

type TrippoModelRow = {
  id: string;
  category: string;
  label: string;
  tokens_original: number;
  unit?: "task" | "animation" | "edited_image";
  series?: TrippoSeries;
  available: boolean;
};

export const TRIPPO_GENERATION_ADDONS: Record<TrippoGenerationAddonId, number> = {
  texture_hd: 10,
  texture_8k_ultra: 20,
  geometry_hd: 20,
  quad: 5,
  smart_low_poly: 10,
  generate_parts: 20,
};

export const TRIPPO_H_GENERATION_BASE: Record<
  TrippoGenerationTask,
  Record<TrippoHTextureTier, number>
> = {
  text_to_model: { none: 10, standard: 20 },
  image_to_model: { none: 20, standard: 30 },
  multiview_to_model: { none: 20, standard: 30 },
};

export const TRIPPO_P_GENERATION_BASE: Record<
  TrippoGenerationTask,
  Record<TrippoPTextureTier, number>
> = {
  text_to_model: { none: 30, standard: 40, detailed: 50 },
  image_to_model: { none: 40, standard: 50, detailed: 60 },
  multiview_to_model: { none: 40, standard: 50, detailed: 60 },
};

export const TRIPPO_SPLAT_CREDITS = {
  image_to_splat: 30,
} as const;

export const TRIPPO_PROCESSING_CREDITS = {
  texture_standard: 10,
  texture_hd: 20,
  texture_8k_ultra: 30,
  convert_basic: 5,
  convert_advanced: 10,
  decimate_v2_smart: 30,
  decimate_v1_basic: 10,
  mesh_segment: 40,
  mesh_complete_default: 50,
  mesh_complete_quick_cap: 30,
  mesh_smartsegment_image: 85,
  mesh_smartsegment_model: 55,
} as const;

export const TRIPPO_ANIMATION_CREDITS = {
  animate_prerigcheck: 0,
  animate_rig: 25,
  animate_retarget: 10,
} as const;

export const TRIPPO_IMAGE_GEN_CREDITS: Record<
  string,
  Partial<Record<TrippoImageSizeTier, number>>
> = {
  seedream_v4: { "1k": 5, "2k": 5, "4k": 5 },
  seedream_v5: { "1k": 5, "2k": 5, "4k": 5 },
  banana: { "1k": 5 },
  banana2: { "1k": 10, "2k": 10, "4k": 15 },
  banana_pro: { "1k": 15, "2k": 15, "4k": 20 },
  chat_image_1: { "1k": 5 },
  "chat_image_1.5": { "1k": 10 },
  chat_image_2: { "1k": 10, "2k": 10, "4k": 15 },
};

export const TRIPPO_MULTIVIEW_IMAGE_CREDITS = {
  image_to_multiview: 10,
  edit_multiview: 5,
} as const;

export const TRIPPO_CONVERT_ADVANCED_TRIGGERS = [
  "quad",
  "face_limit",
  "flatten_bottom",
  "flatten_bottom_threshold",
  "texture_size",
  "texture_format",
  "pivot_to_center_bottom",
  "scale_factor",
] as const;

function row(
  id: string,
  category: string,
  label: string,
  tokens_original: number,
  extras: Partial<Pick<TrippoModelRow, "unit" | "series" | "available">> = {},
): TrippoModelRow {
  return {
    id,
    category,
    label,
    tokens_original,
    unit: extras.unit ?? "task",
    series: extras.series,
    available: extras.available ?? true,
  };
}

function buildTrippoModelRows(): TrippoModelRow[] {
  const rows: TrippoModelRow[] = [];

  for (const [task, tiers] of Object.entries(TRIPPO_H_GENERATION_BASE) as Array<
    [TrippoGenerationTask, Record<TrippoHTextureTier, number>]
  >) {
    for (const [tier, credits] of Object.entries(tiers) as Array<[TrippoHTextureTier, number]>) {
      rows.push(
        row(`h.${task}.${tier}`, "generation", `H · ${task} · ${tier}`, credits, {
          series: "h",
        }),
      );
    }
  }

  for (const [task, tiers] of Object.entries(TRIPPO_P_GENERATION_BASE) as Array<
    [TrippoGenerationTask, Record<TrippoPTextureTier, number>]
  >) {
    for (const [tier, credits] of Object.entries(tiers) as Array<[TrippoPTextureTier, number]>) {
      rows.push(
        row(`p.${task}.${tier}`, "generation", `P · ${task} · ${tier}`, credits, {
          series: "p",
        }),
      );
    }
  }

  rows.push(
    row("splat.image_to_splat", "generation", "Splat · image_to_splat", TRIPPO_SPLAT_CREDITS.image_to_splat),
  );

  for (const [id, credits] of Object.entries(TRIPPO_GENERATION_ADDONS) as Array<
    [TrippoGenerationAddonId, number]
  >) {
    rows.push(row(`addon.${id}`, "generation_addon", `Addon · ${id}`, credits, { series: "h" }));
  }

  const processingLabels: Record<keyof typeof TRIPPO_PROCESSING_CREDITS, string> = {
    texture_standard: "Texture · standard",
    texture_hd: "Texture · HD",
    texture_8k_ultra: "Texture · 8K ultra",
    convert_basic: "Convert · basic",
    convert_advanced: "Convert · advanced",
    decimate_v2_smart: "Retopology · v2.0 smart",
    decimate_v1_basic: "Retopology · v1.0 basic",
    mesh_segment: "Segmentation",
    mesh_complete_default: "Part completion · default",
    mesh_complete_quick_cap: "Part completion · quick cap",
    mesh_smartsegment_image: "Smart segmentation · image",
    mesh_smartsegment_model: "Smart segmentation · model",
  };
  for (const [id, credits] of Object.entries(TRIPPO_PROCESSING_CREDITS) as Array<
    [keyof typeof TRIPPO_PROCESSING_CREDITS, number]
  >) {
    rows.push(row(`processing.${id}`, "processing", processingLabels[id], credits));
  }

  rows.push(
    row(
      "animate_prerigcheck",
      "animation",
      "Rig check",
      TRIPPO_ANIMATION_CREDITS.animate_prerigcheck,
    ),
    row("animate_rig", "animation", "Auto rig", TRIPPO_ANIMATION_CREDITS.animate_rig),
    row("animate_retarget", "animation", "Animation retarget", TRIPPO_ANIMATION_CREDITS.animate_retarget, {
      unit: "animation",
    }),
  );

  for (const [model, sizes] of Object.entries(TRIPPO_IMAGE_GEN_CREDITS)) {
    for (const [size, credits] of Object.entries(sizes) as Array<[TrippoImageSizeTier, number]>) {
      rows.push(row(`image.${model}.${size}`, "image_generation", `${model} · ${size}`, credits));
    }
  }

  rows.push(
    row(
      "image_to_multiview",
      "image_generation",
      "Image to multiview",
      TRIPPO_MULTIVIEW_IMAGE_CREDITS.image_to_multiview,
    ),
    row(
      "edit_multiview",
      "image_generation",
      "Edit multiview",
      TRIPPO_MULTIVIEW_IMAGE_CREDITS.edit_multiview,
      { unit: "edited_image" },
    ),
  );

  rows.push(
    row("image_to_model", "generation", "Image to 3D · H · standard", TRIPPO_H_GENERATION_BASE.image_to_model.standard, {
      series: "h",
    }),
    row(
      "multiview_to_model",
      "generation",
      "Multiview to 3D · H · standard",
      TRIPPO_H_GENERATION_BASE.multiview_to_model.standard,
      { series: "h" },
    ),
    row("text_to_model", "generation", "Text to 3D · H · standard", TRIPPO_H_GENERATION_BASE.text_to_model.standard, {
      series: "h",
    }),
  );

  return rows;
}

const trippoModelRows = buildTrippoModelRows();

export const TrippoModels = trippoModelRows.map((m) => {
  const price_original = trippoProviderCreditsToEur(m.tokens_original);
  const isFree = m.tokens_original <= 0;
  return {
    id: m.id,
    category: m.category,
    label: m.label,
    unit: m.unit ?? "task",
    series: m.series,
    available: m.available,
    tokens_original: m.tokens_original,
    price_original,
    tokens: isFree ? 0 : Math.ceil(m.tokens_original * MARKUP_FACTOR),
    price: isFree ? 0 : price_original * MARKUP_FACTOR,
  };
});

export type TrippoModel = (typeof TrippoModels)[number];

export type TrippoHGenerationQuoteInput = {
  series: "h";
  task: TrippoGenerationTask;
  texture: TrippoHTextureTier;
  textureQuality?: "standard" | "detailed" | "extreme";
  addons?: TrippoGenerationAddonId[];
};

export type TrippoPGenerationQuoteInput = {
  series: "p";
  task: TrippoGenerationTask;
  texture: TrippoPTextureTier;
};

export type TrippoGenerationQuoteInput = TrippoHGenerationQuoteInput | TrippoPGenerationQuoteInput;

export function quoteTrippoGenerationCredits(input: TrippoGenerationQuoteInput): number {
  if (input.series === "p") {
    return TRIPPO_P_GENERATION_BASE[input.task][input.texture];
  }

  let total = TRIPPO_H_GENERATION_BASE[input.task][input.texture];
  if (input.texture === "standard") {
    if (input.textureQuality === "detailed") total += TRIPPO_GENERATION_ADDONS.texture_hd;
    if (input.textureQuality === "extreme") total += TRIPPO_GENERATION_ADDONS.texture_8k_ultra;
  }

  const addons = new Set(input.addons ?? []);
  for (const addon of addons) {
    if (addon === "texture_hd" || addon === "texture_8k_ultra") continue;
    total += TRIPPO_GENERATION_ADDONS[addon];
  }
  return total;
}

export function quoteTrippoGenerationWalletTokens(input: TrippoGenerationQuoteInput): number {
  const credits = quoteTrippoGenerationCredits(input);
  if (credits <= 0) return 0;
  return Math.ceil(credits * MARKUP_FACTOR);
}

export function getTrippoModelById(id: string): TrippoModel | undefined {
  return TrippoModels.find((m) => m.id === id);
}

export function listTrippoModelsByCategory(category: string): TrippoModel[] {
  return TrippoModels.filter((m) => m.category === category);
}

export const TRIPPO_PRICING_CATALOG = {
  source: "https://developers.tripo3d.ai/en/pricing",
  creditUsd: 0.01,
  hGeneration: TRIPPO_H_GENERATION_BASE,
  pGeneration: TRIPPO_P_GENERATION_BASE,
  generationAddons: TRIPPO_GENERATION_ADDONS,
  splat: TRIPPO_SPLAT_CREDITS,
  processing: TRIPPO_PROCESSING_CREDITS,
  animation: TRIPPO_ANIMATION_CREDITS,
  imageGeneration: TRIPPO_IMAGE_GEN_CREDITS,
  multiviewImage: TRIPPO_MULTIVIEW_IMAGE_CREDITS,
  convertAdvancedTriggers: TRIPPO_CONVERT_ADVANCED_TRIGGERS,
} as const;
