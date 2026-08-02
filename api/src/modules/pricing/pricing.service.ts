import { CHAT_DEBIT_TOKENS, TOKENS_PER_EUR } from "../../config/models/pricing";

import { TOKEN_PACKS } from "../../config/models/tokenPacks";
import {
  getTokenOperationDebit,
  TOKEN_OPERATIONS,
  type TokenOperation,
} from "../../config/models/token-operations";
import { TRIPPO_PRICING_CATALOG, TrippoModels } from "../../config/models/trippo-models";
import { ImageModels } from "../../config/models/image-models";
import { roundEur } from "../../lib/models-cost";
import { TRIPPO_MESH_MODEL_CATALOG, quoteMeshGeneration, resolveMeshOptions } from "../tripo/mesh-options";

const OPERATION_LABELS: Record<TokenOperation, string> = {
  animationRetarget: "Animation retarget",
  chat: "Forge chat message",
  trippoMesh: "Mesh from image",
  rig: "Rigging",
};

export function getPricingCatalog() {
  return {
    rates: {
      tokensPerEur: TOKENS_PER_EUR,
      chatDebitTokens: CHAT_DEBIT_TOKENS,
    },
    packs: TOKEN_PACKS.map(({ id, name, tokens, price }) => ({ id, name, tokens, price })),
    operations: TOKEN_OPERATIONS.map((id) => ({
      id,
      label: OPERATION_LABELS[id],
      tokens: getTokenOperationDebit(id),
    })),
    trippoPricing: TRIPPO_PRICING_CATALOG,
    trippoModels: TrippoModels.map((m) => ({
      id: m.id,
      category: m.category,
      label: m.label,
      unit: m.unit,
      series: m.series ?? null,
      available: m.available,
      tokensOriginal: m.tokens_original,
      tokens: Math.ceil(Number(m.tokens)),
      priceEur: roundEur(Number(m.price)),
    })),
    meshModels: TRIPPO_MESH_MODEL_CATALOG.map((m) => {
      const detailed = resolveMeshOptions({
        model: m.model,
        textureQuality: "detailed",
        geometryQuality: m.supportsGeometryQuality ? "detailed" : "standard",
      });
      const extreme = resolveMeshOptions({
        model: m.model,
        textureQuality: m.supportsTextureExtreme ? "extreme" : "detailed",
        geometryQuality: m.supportsGeometryQuality ? "detailed" : "standard",
      });
      return {
        id: m.id,
        model: m.model,
        series: m.series,
        label: m.label,
        supportsGeometryQuality: m.supportsGeometryQuality,
        supportsTextureExtreme: m.supportsTextureExtreme,
        imageToModelTokens: m.imageToModelTokens,
        multiviewToModelTokens: m.multiviewToModelTokens,
        imageToModelTokensDetailed: quoteMeshGeneration("image_to_model", detailed).walletTokens,
        multiviewToModelTokensDetailed: quoteMeshGeneration("multiview_to_model", detailed).walletTokens,
        imageToModelTokensExtreme: quoteMeshGeneration("image_to_model", extreme).walletTokens,
        multiviewToModelTokensExtreme: quoteMeshGeneration("multiview_to_model", extreme).walletTokens,
      };
    }),
    imageModels: ImageModels.filter((m) => m.available).map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      tokens: Math.ceil(Number(m.tokens)),
      priceEur: roundEur(Number(m.price)),
      available: m.available,
      imageToImage: m.is_image_to_image,
    })),
  };
}
