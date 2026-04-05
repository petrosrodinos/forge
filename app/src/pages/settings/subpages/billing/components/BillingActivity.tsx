import type { UseQueryResult } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { Receipt, Zap } from "lucide-react";
import type { PurchaseRecordDto, TokenUsageRecordDto } from "@/features/billing/interfaces/billing.interfaces";
import { cn } from "@/utils/cn";
import { formatEur } from "@/features/billing/utils/format";
import { formatUsageKind } from "../utils";
import { PurchaseHistoryTableSkeleton, TokenUsageTableSkeleton } from "./BillingSkeletons";
import { BillingEmptyState } from "./BillingEmptyState";

export type BillingActivityTab = "purchases" | "usage";

interface BillingActivityProps {
  activityTab: BillingActivityTab;
  onTabChange: (tab: BillingActivityTab) => void;
  historyQuery: UseQueryResult<PurchaseRecordDto[] | undefined, Error>;
  usageQuery: UseQueryResult<TokenUsageRecordDto[] | undefined, Error>;
  packNameById: Map<string, string>;
}

export function BillingActivity({
  activityTab,
  onTabChange,
  historyQuery,
  usageQuery,
  packNameById,
}: BillingActivityProps) {
  const tabs: { id: BillingActivityTab; label: string; icon: LucideIcon }[] = [
    { id: "purchases", label: "Purchase history", icon: Receipt },
    { id: "usage", label: "Token usage", icon: Zap },
  ];

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-100">Activity</h2>
          <p className="text-sm text-slate-500 mt-0.5">Invoices and how tokens were spent.</p>
        </div>
      </div>

      <div
        className="inline-flex p-1 rounded-xl bg-surface/80 border border-border ring-1 ring-white/5"
        role="tablist"
        aria-label="Billing activity"
      >
        {tabs.map(({ id, label, icon: Icon }) => {
          const selected = activityTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                selected
                  ? "bg-panel text-accent-light shadow-sm ring-1 ring-border"
                  : "text-slate-500 hover:text-slate-300",
              )}
              onClick={() => onTabChange(id)}
            >
              <Icon className="h-4 w-4 opacity-80" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

      {activityTab === "purchases" && (
        <>
          {historyQuery.isLoading ? (
            <PurchaseHistoryTableSkeleton />
          ) : (historyQuery.data?.length ?? 0) === 0 ? (
            <BillingEmptyState
              icon={Receipt}
              title="No purchases yet"
              description="When you buy a token pack, it will show up here with amount and date."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-panel/40 ring-1 ring-white/5">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border bg-surface/70 text-slate-500">
                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Pack</th>
                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Tokens</th>
                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Amount</th>
                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {historyQuery.data!.map((row, i) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "transition-colors hover:bg-surface/50",
                        i % 2 === 1 ? "bg-surface/25" : "bg-transparent",
                      )}
                    >
                      <td className="px-5 py-3.5 text-slate-200 font-medium">
                        {packNameById.get(row.packId) ?? row.packId}
                      </td>
                      <td className="px-5 py-3.5 font-mono tabular-nums text-slate-300">{row.tokens}</td>
                      <td className="px-5 py-3.5 font-mono tabular-nums text-slate-200">
                        {formatEur(row.amountCents, true)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
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

      {activityTab === "usage" && (
        <>
          {usageQuery.isLoading ? (
            <TokenUsageTableSkeleton />
          ) : (usageQuery.data?.length ?? 0) === 0 ? (
            <BillingEmptyState
              icon={Zap}
              title="No usage recorded"
              description="Token deductions from image generation, 3D, and chat will appear here."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-panel/40 ring-1 ring-white/5">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border bg-surface/70 text-slate-500">
                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Kind</th>
                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Model</th>
                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Operation</th>
                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Tokens</th>
                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Costs meta</th>
                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {usageQuery.data!.map((row, i) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "transition-colors hover:bg-surface/50",
                        i % 2 === 1 ? "bg-surface/25" : "bg-transparent",
                      )}
                    >
                      <td className="px-5 py-3.5 text-slate-200">
                        <span className="tag-violet inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium">
                          {formatUsageKind(row.usageKind)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-xs break-all max-w-40 md:max-w-none">
                        {row.modelId}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{row.operation ?? "—"}</td>
                      <td className="px-5 py-3.5 font-mono tabular-nums text-slate-200">{row.tokens}</td>
                      <td
                        className="px-5 py-3.5 text-slate-500 text-xs max-w-56 truncate"
                        title={row.metadata ? JSON.stringify(row.metadata) : undefined}
                      >
                        {row.metadata ? "Yes" : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
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
  );
}
