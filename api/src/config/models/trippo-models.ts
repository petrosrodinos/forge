import { trippoProviderCreditsToEur } from "../../lib/models-cost";
import { MARKUP_FACTOR } from "./pricing";

type TrippoModelRow = {
  id: string;
  /** Tripo fixed credit cost (pre-markup). */
  tokens_original: number;
};

const trippoModelRows: TrippoModelRow[] = [
  { id: "animate_prerigcheck", tokens_original: 0 },
  { id: "animate_retarget", tokens_original: 10 },
  { id: "animate_rig", tokens_original: 25 },
  { id: "image_to_model", tokens_original: 30 },
  { id: "multiview_to_model", tokens_original: 30 },
];

export const TrippoModels = trippoModelRows.map((m) => {
  const price_original = trippoProviderCreditsToEur(m.tokens_original);
  const isFree = m.tokens_original <= 0;
  return {
    id: m.id,
    tokens_original: m.tokens_original,
    price_original,
    tokens: isFree ? 0 : Math.ceil(m.tokens_original * MARKUP_FACTOR),
    price: isFree ? 0 : price_original * MARKUP_FACTOR,
  };
});
