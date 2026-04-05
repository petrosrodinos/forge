import { getTokenOperationDebit } from "../../config/models/token-operations";

/**
 * Stable keys for UI and clients. Add new rows here when new debited flows ship.
 * Token values always mirror `getTokenOperationDebit` / image model catalog — single source in config.
 */
export const PRICING_COST_KEYS = {
  AGENT_CHAT: "agent_chat",
  FORGE_PIPELINE_MESH_RIG: "forge_pipeline_mesh_rig",
  TRIPPO_MESH_STANDALONE: "trippo_mesh_standalone",
  RIGGING: "rigging",
  ANIMATION_RETARGET: "animation_retarget",
  IMAGE_GENERATION: "image_generation",
} as const;

export type PricingCostKey = (typeof PRICING_COST_KEYS)[keyof typeof PRICING_COST_KEYS];

export type PricingCostItemFixed = {
  kind: "fixed";
  key: PricingCostKey | string;
  label: string;
  unit: string;
  tokens: number;
};

export type PricingCostItemVariable = {
  kind: "variable";
  key: PricingCostKey | string;
  label: string;
  unit: string;
  catalogRef: "imageModels";
  description?: string;
};

export type PricingCostItemDto = PricingCostItemFixed | PricingCostItemVariable;

export type PricingCostsDto = {
  version: 1;
  items: PricingCostItemDto[];
};

export function buildPricingCosts(): PricingCostsDto {
  return {
    version: 1,
    items: [
      {
        kind: "fixed",
        key: PRICING_COST_KEYS.AGENT_CHAT,
        label: "AI variant prompt & Forge chat",
        unit: "per_request",
        tokens: getTokenOperationDebit("chat"),
      },
      {
        kind: "fixed",
        key: PRICING_COST_KEYS.FORGE_PIPELINE_MESH_RIG,
        label: "Forge 3D pipeline (image → mesh + rig step)",
        unit: "per_run",
        tokens: getTokenOperationDebit("pipeline"),
      },
      {
        kind: "fixed",
        key: PRICING_COST_KEYS.TRIPPO_MESH_STANDALONE,
        label: "Mesh from image (standalone API)",
        unit: "per_request",
        tokens: getTokenOperationDebit("trippoMesh"),
      },
      {
        kind: "fixed",
        key: PRICING_COST_KEYS.RIGGING,
        label: "Rigging",
        unit: "per_request",
        tokens: getTokenOperationDebit("rig"),
      },
      {
        kind: "fixed",
        key: PRICING_COST_KEYS.ANIMATION_RETARGET,
        label: "Animation generation",
        unit: "per_request",
        tokens: getTokenOperationDebit("animationRetarget"),
      },
      {
        kind: "variable",
        key: PRICING_COST_KEYS.IMAGE_GENERATION,
        label: "Image generation",
        unit: "per_generation",
        catalogRef: "imageModels",
        description: "Depends on the selected image model; see token value in the model picker.",
      },
    ],
  };
}
