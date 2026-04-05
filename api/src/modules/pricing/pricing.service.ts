import { CHAT_DEBIT_TOKENS, TOKEN_PER_USD } from "../../config/models/pricing";
import { TOKEN_PACKS } from "../../config/models/tokenPacks";
import {
  getTokenOperationDebit,
  TOKEN_OPERATIONS,
  type TokenOperation,
} from "../../config/models/token-operations";
import { TrippoModels } from "../../config/models/trippo-models";
import { ImageModels } from "../../config/models/image-models";

type ListedTokenOperation = Exclude<TokenOperation, "pipeline">;

const OPERATION_LABELS: Record<ListedTokenOperation, string> = {
  animationRetarget: "Animation retarget",
  chat: "Forge chat message",
  trippoMesh: "Mesh from image",
  rig: "Rigging",
};

function isListedOperation(id: TokenOperation): id is ListedTokenOperation {
  return id !== "pipeline";
}

export function getPricingCatalog() {
  return {
    rates: {
      tokensPerUsd: TOKEN_PER_USD,
      chatDebitTokens: CHAT_DEBIT_TOKENS,
    },
    packs: TOKEN_PACKS.map(({ id, name, tokens, price }) => ({ id, name, tokens, price })),
    operations: TOKEN_OPERATIONS.filter(isListedOperation).map((id) => ({
      id,
      label: OPERATION_LABELS[id],
      tokens: getTokenOperationDebit(id),
    })),
    trippoModels: TrippoModels.map((m) => ({
      id: m.id,
      tokens: Math.ceil(Number(m.tokens)),
      priceUsd: Number(m.price),
    })),
    imageModels: ImageModels.filter((m) => m.available).map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      tokens: Math.ceil(Number(m.tokens)),
      priceUsd: Number(m.price),
      available: m.available,
      imageToImage: m.is_image_to_image,
    })),
  };
}
