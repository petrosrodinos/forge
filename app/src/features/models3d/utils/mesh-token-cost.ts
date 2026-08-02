import type { PricingMeshModelDto } from "@/features/pricing/interfaces/pricing.interfaces";
import type { MeshGenerationOptions } from "@/features/models3d/interfaces/mesh-options.interfaces";

const TEXTURE_DETAILED_TOKENS = 12;
const TEXTURE_EXTREME_TOKENS = 24;
const GEOMETRY_DETAILED_TOKENS = 24;

export function meshTokenCost(
  meshModel: PricingMeshModelDto | undefined,
  opts: MeshGenerationOptions,
  mode: "image" | "multiview",
): number | null {
  if (!meshModel) return null;
  let tokens = mode === "image" ? meshModel.imageToModelTokens : meshModel.multiviewToModelTokens;
  if (opts.textureQuality === "detailed") tokens += TEXTURE_DETAILED_TOKENS;
  if (opts.textureQuality === "extreme") tokens += TEXTURE_EXTREME_TOKENS;
  if (opts.geometryQuality === "detailed" && meshModel.supportsGeometryQuality) {
    tokens += GEOMETRY_DETAILED_TOKENS;
  }
  return tokens;
}
