import { apiFetch } from "@/utils/apiClient";
import type { PricingCatalogDto } from "@/features/pricing/interfaces/pricing.interfaces";

export function getPricingCatalog() {
  return apiFetch<PricingCatalogDto>("/api/pricing/catalog");
}
