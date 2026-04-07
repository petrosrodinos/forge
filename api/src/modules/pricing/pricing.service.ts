import { CHAT_DEBIT_TOKENS, TOKENS_PER_EUR } from "../../config/models/pricing";

import { TOKEN_PACKS } from "../../config/models/tokenPacks";
import {
  getTokenOperationDebit,
  TOKEN_OPERATIONS,
  type TokenOperation,
} from "../../config/models/token-operations";
import { TrippoModels } from "../../config/models/trippo-models";
import { ImageModels } from "../../config/models/image-models";
import { roundEur } from "../../lib/models-cost";

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
    trippoModels: TrippoModels.map((m) => ({
      id: m.id,
      tokens: Math.ceil(Number(m.tokens)),
      priceEur: roundEur(Number(m.price)),
    })),
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
