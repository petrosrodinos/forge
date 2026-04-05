import type { PricingCostsDto } from "@/features/pricing/interfaces/pricing-costs.interfaces";

export function getFixedCostTokens(data: PricingCostsDto | undefined, key: string): number | undefined {
  if (!data) return undefined;
  const item = data.items.find((i) => i.kind === "fixed" && i.key === key);
  return item?.kind === "fixed" ? item.tokens : undefined;
}
