import { Coins, Loader2, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { TokenPackDto } from "@/features/billing/interfaces/billing.interfaces";
import { cn } from "@/utils/cn";
import { formatEur, formatPricePer1kTokens } from "@/features/billing/utils/format";

interface TokenPackCardProps {
  pack: TokenPackDto;
  /** Featured tier (e.g. second pack in the list). */
  showFeaturedBadge: boolean;
  /** True while this pack’s action is in progress (shows spinner). */
  isActionBusy: boolean;
  /** True while any pack action is in flight (disables all cards). */
  isActionLocked: boolean;
  onPrimaryAction: () => void;
  /** Primary button label when not busy. */
  primaryCtaLabel?: string;
  /** Shown while `isActionBusy` is true. */
  busyCtaLabel?: string;
  /** Stripe footnote under the button. */
  showStripeFooter?: boolean;
}

export function TokenPackCard({
  pack,
  showFeaturedBadge,
  isActionBusy,
  isActionLocked,
  onPrimaryAction,
  primaryCtaLabel = "Continue to checkout",
  busyCtaLabel = "Redirecting…",
  showStripeFooter = true,
}: TokenPackCardProps) {
  const per1k = formatPricePer1kTokens(pack.price, pack.tokens);

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-panel/95 shadow-lg shadow-black/15 transition-all duration-300",
        showFeaturedBadge
          ? "border-accent/40 ring-2 ring-accent/20 hover:border-accent/55 hover:ring-accent/30"
          : "border-border ring-1 ring-white/5 hover:border-accent/25 hover:ring-accent/10",
      )}
    >
      <div
        className={cn(
          "h-1 w-full shrink-0 bg-gradient-to-r",
          showFeaturedBadge
            ? "from-accent via-accent-light to-accent"
            : "from-border via-accent/25 to-border opacity-80 group-hover:via-accent/40",
        )}
        aria-hidden
      />

      {showFeaturedBadge ? (
        <div className="absolute right-4 top-5 z-10">
          <span className="tag-violet inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold">
            <Sparkles className="h-3 w-3" aria-hidden />
            Popular
          </span>
        </div>
      ) : null}

      <div className="relative flex flex-1 flex-col p-6 pt-7">
        <div
          className="pointer-events-none absolute -right-8 top-12 h-32 w-32 rounded-full bg-accent/10 blur-2xl opacity-70 transition-opacity group-hover:opacity-100"
          aria-hidden
        />

        <div className="relative flex items-start gap-3">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition-colors",
              showFeaturedBadge
                ? "bg-accent/20 text-accent-light ring-accent/30"
                : "bg-surface/80 text-slate-400 ring-border group-hover:text-accent-light group-hover:ring-accent/20",
            )}
          >
            <Coins className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 pr-2">
            <h3 className="text-base font-semibold tracking-tight text-slate-100">{pack.name}</h3>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums tracking-tight text-slate-50">
              {pack.tokens.toLocaleString()}
              <span className="ml-2 text-sm font-sans font-medium text-slate-500">tokens</span>
            </p>
          </div>
        </div>

        <div className="relative mt-6 rounded-xl border border-border/80 bg-surface/50 p-4 ring-1 ring-white/5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">One-time</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-100">
                {formatEur(pack.price, false)}
              </p>
            </div>
            {per1k ? (
              <p className="text-right text-xs leading-snug text-slate-500">
                <span className="tabular-nums text-slate-400">{per1k}</span>
                <br />
                per 1k tokens
              </p>
            ) : null}
          </div>
        </div>

        <Button className="relative mt-5 w-full" size="lg" disabled={isActionLocked} onClick={onPrimaryAction}>
          {isActionBusy ? (
            <>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              {busyCtaLabel}
            </>
          ) : (
            primaryCtaLabel
          )}
        </Button>

        {showStripeFooter ? (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-slate-600">
            <Lock className="h-3 w-3 shrink-0 text-slate-500" aria-hidden />
            Secure payment via Stripe
          </p>
        ) : null}
      </div>
    </article>
  );
}
