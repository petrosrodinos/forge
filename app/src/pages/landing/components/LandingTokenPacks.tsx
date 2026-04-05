import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/use-auth.hooks";
import { useCheckout, usePacks } from "@/features/billing/hooks/use-billing.hooks";
import { TokenPacksGrid } from "@/features/billing/components/TokenPacksGrid";
import { BILLING_PACK_QUERY_PARAM } from "@/features/billing/constants";
import { LANDING_PACKS_SUBTITLE, LANDING_PACKS_TITLE } from "@/pages/landing/constants";
import { cn } from "@/utils/cn";

export function LandingTokenPacks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const packsQuery = usePacks();
  const checkoutMutation = useCheckout();

  function handlePackAction(packId: string) {
    if (user) {
      checkoutMutation.mutate(packId);
      return;
    }
    navigate(`/register?${BILLING_PACK_QUERY_PARAM}=${encodeURIComponent(packId)}`);
  }

  return (
    <section
      id="token-packs"
      className="relative z-10 border-t border-border/60 bg-surface/20"
      aria-labelledby="token-packs-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <p
            className={cn(
              "font-mono text-xs font-medium uppercase tracking-widest text-accent-light/90",
            )}
          >
            Pricing
          </p>
          <h2
            id="token-packs-heading"
            className="mt-3 text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl"
          >
            {LANDING_PACKS_TITLE}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">{LANDING_PACKS_SUBTITLE}</p>
        </div>
        <div className="mt-10">
          <TokenPacksGrid
            packs={packsQuery.data}
            isLoading={packsQuery.isLoading}
            onPackAction={handlePackAction}
            busyPackId={checkoutMutation.isPending ? checkoutMutation.variables ?? null : null}
            isActionLocked={checkoutMutation.isPending}
            primaryCtaLabel={user ? undefined : "Get started"}
          />
        </div>
      </div>
    </section>
  );
}
