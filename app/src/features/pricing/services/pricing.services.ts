import { apiFetch } from "@/utils/apiClient";
import type { PricingCatalogDto } from "@/features/pricing/interfaces/pricing.interfaces";
import type { PricingCostsDto } from "@/features/pricing/interfaces/pricing-costs.interfaces";

export function getPricingCatalog() {
  return apiFetch<PricingCatalogDto>("/api/pricing/catalog");
}

export function getPricingCosts() {
  return apiFetch<PricingCostsDto>("/api/pricing/costs");
}
