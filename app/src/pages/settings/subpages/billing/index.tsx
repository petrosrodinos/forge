import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useBalance,
  useCheckout,
  usePacks,
  usePurchaseHistory,
  useTokenUsage,
} from "@/features/billing/hooks/use-billing.hooks";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/cn";

const eur = (amount: number, fromCents: boolean) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(fromCents ? amount / 100 : amount);

function formatUsageKind(kind: string) {
  const map: Record<string, string> = { image: "Image", trippo: "Tripo", chat: "Chat" };
  return map[kind] ?? kind;
}

type ActivityTab = "purchases" | "usage";

function BalanceSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <Skeleton className="h-11 w-52 max-w-full rounded-md" />
      <Skeleton className="h-3 w-40 rounded-md" />
    </div>
  );
}

function TokenPacksSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-panel p-5 flex flex-col gap-3">
          <Skeleton className="h-5 w-28 rounded-md" />
          <Skeleton className="h-4 w-36 rounded-md" />
          <Skeleton className="h-7 w-24 rounded-md" />
          <Skeleton className="h-9 w-full mt-auto rounded-md" />
        </div>
      ))}
    </div>
  );
}

function PurchaseHistoryTableSkeleton() {
  return (
    <div className="rounded-lg border border-border overflow-hidden" aria-hidden>
      <div className="bg-surface px-4 py-3 flex flex-wrap gap-6">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="divide-y divide-border">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="px-4 py-3 flex flex-wrap gap-6 items-center bg-panel/50">
            <Skeleton className="h-4 w-24 sm:flex-1 sm:max-w-[10rem]" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-36" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TokenUsageTableSkeleton() {
  return (
    <div className="rounded-lg border border-border overflow-hidden" aria-hidden>
      <div className="bg-surface px-4 py-3 flex flex-wrap gap-4">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-10" />
      </div>
      <div className="divide-y divide-border">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="px-4 py-3 flex flex-wrap gap-4 items-center bg-panel/50">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 flex-1 min-w-[6rem] max-w-[12rem]" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SettingsBillingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const [activityTab, setActivityTab] = useState<ActivityTab>("purchases");

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

  const packNameById = new Map((packsQuery.data ?? []).map((p) => [p.id, p.name]));

  const lastUpdated =
    balanceQuery.dataUpdatedAt > 0
      ? new Date(balanceQuery.dataUpdatedAt).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;

  return (
    <div className="p-6 md:p-8 max-w-4xl space-y-10">
      <div>
        <h1 className="text-lg font-semibold text-slate-100 mb-1">Billing</h1>
        <p className="text-sm text-slate-400">Buy token packs, then review purchases or token usage below.</p>
      </div>

      <section className="rounded-xl border border-border bg-panel p-6">
        <h2 className="text-sm font-medium text-slate-300 mb-4">Balance</h2>
        {balanceQuery.isLoading ? (
          <BalanceSkeleton />
        ) : (
          <div className="space-y-1">
            <p className="text-4xl font-mono font-semibold tabular-nums text-accent-light">
              {balanceQuery.data?.balance ?? "—"}
              <span className="text-lg font-sans font-normal text-slate-500 ml-2">tokens</span>
            </p>
            {lastUpdated && <p className="text-xs text-slate-500">Last updated {lastUpdated}</p>}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-slate-300 mb-4">Token packs</h2>
        {packsQuery.isLoading ? (
          <TokenPacksSkeleton />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {(packsQuery.data ?? []).map((pack) => {
              const busy = checkoutMutation.isPending && checkoutMutation.variables === pack.id;
              return (
                <div key={pack.id} className="rounded-xl border border-border bg-panel p-5 flex flex-col gap-3">
                  <div>
                    <p className="font-medium text-slate-100">{pack.name}</p>
                    <p className="text-sm text-slate-400 mt-1">{pack.tokens.toLocaleString()} tokens</p>
                    <p className="text-lg font-mono tabular-nums text-slate-200 mt-2">{eur(pack.price, false)}</p>
                  </div>
                  <Button className="mt-auto w-full" disabled={checkoutMutation.isPending} onClick={() => checkoutMutation.mutate(pack.id)}>
                    {busy ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
                        Redirecting…
                      </>
                    ) : (
                      "Buy"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-slate-300 mb-3">Activity</h2>
        <div className="flex gap-1 border-b border-border mb-4" role="tablist" aria-label="Billing activity">
          <button
            type="button"
            role="tab"
            aria-selected={activityTab === "purchases"}
            className={cn(
              "px-3 py-2 text-sm font-medium rounded-t-md border-b-2 -mb-px transition-colors",
              activityTab === "purchases"
                ? "text-accent-light border-accent-light bg-surface/80"
                : "text-slate-500 border-transparent hover:text-slate-300",
            )}
            onClick={() => setActivityTab("purchases")}
          >
            Purchase history
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activityTab === "usage"}
            className={cn(
              "px-3 py-2 text-sm font-medium rounded-t-md border-b-2 -mb-px transition-colors",
              activityTab === "usage"
                ? "text-accent-light border-accent-light bg-surface/80"
                : "text-slate-500 border-transparent hover:text-slate-300",
            )}
            onClick={() => setActivityTab("usage")}
          >
            Token usage
          </button>
        </div>

        {activityTab === "purchases" && (
          <>
            {historyQuery.isLoading ? (
              <PurchaseHistoryTableSkeleton />
            ) : (historyQuery.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500 rounded-lg border border-dashed border-border px-4 py-8 text-center">
                No purchases yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface text-slate-400 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 font-medium">Pack</th>
                      <th className="px-4 py-3 font-medium">Tokens</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {historyQuery.data!.map((row) => (
                      <tr key={row.id} className="bg-panel/50">
                        <td className="px-4 py-3 text-slate-200">{packNameById.get(row.packId) ?? row.packId}</td>
                        <td className="px-4 py-3 font-mono tabular-nums text-slate-300">{row.tokens}</td>
                        <td className="px-4 py-3 font-mono tabular-nums text-slate-300">{eur(row.amountCents, true)}</td>
                        <td className="px-4 py-3 text-slate-400">{new Date(row.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activityTab === "usage" && (
          <>
            {usageQuery.isLoading ? (
              <TokenUsageTableSkeleton />
            ) : (usageQuery.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500 rounded-lg border border-dashed border-border px-4 py-8 text-center">
                No token usage recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface text-slate-400 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 font-medium">Kind</th>
                      <th className="px-4 py-3 font-medium">Model</th>
                      <th className="px-4 py-3 font-medium">Operation</th>
                      <th className="px-4 py-3 font-medium">Tokens</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {usageQuery.data!.map((row) => (
                      <tr key={row.id} className="bg-panel/50">
                        <td className="px-4 py-3 text-slate-200">{formatUsageKind(row.usageKind)}</td>
                        <td className="px-4 py-3 text-slate-300 font-mono text-xs break-all max-w-[10rem] md:max-w-none">
                          {row.modelId}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{row.operation ?? "—"}</td>
                        <td className="px-4 py-3 font-mono tabular-nums text-slate-300">{row.tokens}</td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                          {new Date(row.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
