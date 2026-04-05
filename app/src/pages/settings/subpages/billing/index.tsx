import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, RefreshCw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useBalance, useCheckout, usePacks, usePurchaseHistory, useTokenUsage } from "@/features/billing/hooks/use-billing.hooks";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/cn";
import { TokenPacksGrid } from "@/features/billing/components/TokenPacksGrid";
import { BillingActivity, type BillingActivityTab } from "./components/BillingActivity";
import { BalanceSkeleton } from "./components/BillingSkeletons";

export default function SettingsBillingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const [activityTab, setActivityTab] = useState<BillingActivityTab>("purchases");

  const balanceQuery = useBalance();
  const packsQuery = usePacks();
  const historyQuery = usePurchaseHistory();
  const usageQuery = useTokenUsage({ enabled: activityTab === "usage" });
  const checkoutMutation = useCheckout();

  useEffect(() => {
    const success = searchParams.get("success");
    const cancelled = searchParams.get("cancelled");
    if (success === "1") {
      toast.success("Purchase complete — tokens added to your balance.");
      void queryClient.invalidateQueries({ queryKey: ["billing", "balance"] });
      void queryClient.invalidateQueries({ queryKey: ["billing", "history"] });
      void queryClient.invalidateQueries({ queryKey: ["billing", "usage"] });
      void fetchMe();
      searchParams.delete("success");
      setSearchParams(searchParams, { replace: true });
    }
    if (cancelled === "1") {
      toast.message("Purchase cancelled.");
      searchParams.delete("cancelled");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, queryClient, fetchMe]);

  const packs = packsQuery.data ?? [];
  const packNameById = new Map(packs.map((p) => [p.id, p.name]));

  const lastUpdated =
    balanceQuery.dataUpdatedAt > 0
      ? new Date(balanceQuery.dataUpdatedAt).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;

  return (
    <div className="relative min-h-full">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-accent/12 via-accent/5 to-transparent" aria-hidden />
      <div className="relative p-6 md:p-8 max-w-5xl space-y-12 pb-16">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-light ring-1 ring-accent/25">
              <CreditCard className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-100">Billing</h1>
              <p className="text-sm text-slate-500 mt-1 max-w-lg leading-relaxed">Top up your token balance for generations and 3D workflow. Secure checkout via Stripe.</p>
            </div>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-2xl border border-border bg-panel ring-1 ring-white/5 shadow-lg shadow-black/20">
          <div className="pointer-events-none absolute -right-16 -top-24 h-48 w-48 rounded-full bg-accent/20 blur-3xl" aria-hidden />
          <div className="relative p-6 md:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-6">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Wallet className="h-4 w-4 text-accent-light shrink-0" aria-hidden />
                Token balance
              </div>
              <Button type="button" variant="ghost" size="sm" className="self-start text-slate-500 hover:text-slate-300" disabled={balanceQuery.isFetching} onClick={() => void balanceQuery.refetch()}>
                <RefreshCw className={cn("h-3.5 w-3.5", balanceQuery.isFetching && "animate-spin")} aria-hidden />
                Refresh
              </Button>
            </div>

            {balanceQuery.isLoading ? (
              <BalanceSkeleton />
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Available now</p>
                <p className="text-4xl md:text-5xl font-semibold tabular-nums tracking-tight text-slate-50">
                  <span className="font-mono text-accent-light">{balanceQuery.data?.balance ?? "—"}</span>
                  <span className="text-lg md:text-xl font-sans font-normal text-slate-500 ml-3">tokens</span>
                </p>
                {lastUpdated ? (
                  <p className="text-xs text-slate-500 pt-2 flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-light/90" aria-hidden />
                    Updated {lastUpdated}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-slate-100">Token packs</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              The second pack is highlighted as our recommended tier. Checkout opens in a secure Stripe session.
            </p>
          </div>

          <TokenPacksGrid
            packs={packs}
            isLoading={packsQuery.isLoading}
            onPackAction={(packId) => checkoutMutation.mutate(packId)}
            busyPackId={checkoutMutation.isPending ? checkoutMutation.variables : null}
            isActionLocked={checkoutMutation.isPending}
          />
        </section>

        <BillingActivity activityTab={activityTab} onTabChange={setActivityTab} historyQuery={historyQuery} usageQuery={usageQuery} packNameById={packNameById} />
      </div>
    </div>
  );
}
