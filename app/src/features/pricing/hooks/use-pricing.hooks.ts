import { useQuery } from "@tanstack/react-query";
import { getPricingCatalog, getPricingCosts } from "@/features/pricing/services/pricing.services";

export function usePricingCatalog() {
  return useQuery({
    queryKey: ["pricing", "catalog"],
    queryFn: getPricingCatalog,
    staleTime: 60_000,
  });
}

export function usePricingCosts() {
  return useQuery({
    queryKey: ["pricing", "costs"],
    queryFn: getPricingCosts,
    staleTime: 5 * 60_000,
  });
}
