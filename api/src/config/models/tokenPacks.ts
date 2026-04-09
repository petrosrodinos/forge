import { env } from "../env/env-validation";
import { stripe } from "../../integrations/stripe/stripe.client";

export interface TokenPack {
  id: string;
  name: string;
  tokens: number;
  price: number;
}

export const TOKEN_PACKS: TokenPack[] = [
  { id: "starter", name: "Starter", tokens: 500, price: 5 },
  { id: "creator", name: "Creator", tokens: 2000, price: 20 },
  { id: "studio", name: "Studio", tokens: 5000, price: 50 },
];

export function getPackById(id: string): TokenPack | undefined {
  return TOKEN_PACKS.find((p) => p.id === id);
}

const DEV_PRICE_IDS_BY_PACK: Record<string, string> = {
  starter: "price_1TIYGCGyoyONuwzMdZVFTish",
  creator: "price_1TIYGDGyoyONuwzMjl2wSSPM",
  studio: "price_1TIYGEGyoyONuwzMQKM6cb1h",
};

const PROD_PRODUCT_IDS_BY_PACK: Record<string, string> = {
  starter: "prod_UIVhTZLInP12dW",
  creator: "prod_UIVhdVb81kp0Ct",
  studio: "prod_UIVhhcTRDgBYP7",
};

const packStripePriceCache = new Map<string, string>();

/**
 * Resolves the Stripe Checkout price id for a pack.
 * - development/test: uses fixed test `price_...` ids
 * - production: resolves the active one-time EUR price from configured `prod_...` product ids
 */
export async function resolveStripePriceIdForPack(packId: string): Promise<string> {
  const cached = packStripePriceCache.get(packId);
  if (cached) return cached;

  const pack = getPackById(packId);
  if (!pack) throw new Error(`Unknown token pack: ${packId}`);

  if (env.NODE_ENV !== "production") {
    const devPriceId = DEV_PRICE_IDS_BY_PACK[packId];
    if (!devPriceId) throw new Error(`Missing development Stripe price id for pack: ${packId}`);
    packStripePriceCache.set(packId, devPriceId);
    return devPriceId;
  }

  const productId = PROD_PRODUCT_IDS_BY_PACK[packId];
  if (!productId) throw new Error(`Missing production Stripe product id for pack: ${packId}`);

  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    type: "one_time",
    limit: 100,
  });

  const expectedAmount = Math.round(pack.price * 100);
  const matchedPrice = prices.data.find((price) => price.currency === "eur" && price.unit_amount === expectedAmount);

  if (!matchedPrice?.id) {
    throw new Error(
      `No active EUR one-time Stripe price found for pack '${packId}' (product=${productId}, amount=${expectedAmount})`,
    );
  }

  packStripePriceCache.set(packId, matchedPrice.id);
  return matchedPrice.id;
}
