import { useQuery } from "@tanstack/react-query";
import { getPricingCatalog } from "@/features/pricing/services/pricing.services";

export function usePricingCatalog() {
  return useQuery({
    queryKey: ["pricing", "catalog"],
    queryFn: getPricingCatalog,
    staleTime: 60_000,
  });
}
