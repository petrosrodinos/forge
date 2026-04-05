import type { TokenPackDto } from "@/features/billing/interfaces/billing.interfaces";
import { TokenPackCard } from "@/features/billing/components/TokenPackCard";
import { TokenPacksSkeleton } from "@/features/billing/components/TokenPacksSkeleton";

export interface TokenPacksGridProps {
  packs: TokenPackDto[] | undefined;
  isLoading: boolean;
  onPackAction: (packId: string) => void;
  /** Which pack id shows the busy state (e.g. checkout redirect). */
  busyPackId?: string | null;
  /** Disable all pack buttons (e.g. while any checkout is pending). */
  isActionLocked?: boolean;
  primaryCtaLabel?: string;
  busyCtaLabel?: string;
  showStripeFooter?: boolean;
}

/** Default featured row: second pack when at least two packs exist. */
export function defaultFeaturedPackIndex(packCount: number): number | null {
  return packCount >= 2 ? 1 : null;
}

export function TokenPacksGrid({
  packs,
  isLoading,
  onPackAction,
  busyPackId = null,
  isActionLocked = false,
  primaryCtaLabel,
  busyCtaLabel,
  showStripeFooter,
}: TokenPacksGridProps) {
  if (isLoading) {
    return <TokenPacksSkeleton />;
  }

  const list = packs ?? [];
  const featuredIndex = defaultFeaturedPackIndex(list.length);

  return (
    <div className="grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((pack, index) => (
        <TokenPackCard
          key={pack.id}
          pack={pack}
          showFeaturedBadge={featuredIndex !== null && index === featuredIndex}
          isActionBusy={busyPackId === pack.id}
          isActionLocked={isActionLocked}
          onPrimaryAction={() => onPackAction(pack.id)}
          primaryCtaLabel={primaryCtaLabel}
          busyCtaLabel={busyCtaLabel}
          showStripeFooter={showStripeFooter}
        />
      ))}
    </div>
  );
}
