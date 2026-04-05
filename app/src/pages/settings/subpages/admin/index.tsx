import { useState } from "react";
import { Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/hooks/use-auth.hooks";
import { useAdminMetrics, useAdminUsers, useDeleteAdminUser } from "@/features/admin/hooks/use-admin.hooks";
import type { AdminMetricsDto, AdminUserRowDto } from "@/features/admin/interfaces/admin.interfaces";
import { formatEur } from "@/features/billing/utils/format";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/utils/cn";

function formatUsdLedger(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 }).format(value);
}

export default function SettingsAdminPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const metricsQuery = useAdminMetrics(isAdmin);
  const usersQuery = useAdminUsers(isAdmin);
  const deleteUser = useDeleteAdminUser();
  const [userPendingDelete, setUserPendingDelete] = useState<AdminUserRowDto | null>(null);

  const confirmRemoveUser = () => {
    if (!userPendingDelete) return;
    const id = userPendingDelete.id;
    deleteUser.mutate(id, {
      onSuccess: () => {
        toast.success("User and cloud assets removed");
        setUserPendingDelete(null);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Could not remove user");
      },
    });
  };

  return (
    <div className="relative min-h-full">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-violet-500/10 via-violet-500/5 to-transparent" aria-hidden />
      <div className="relative p-6 md:p-8 max-w-6xl space-y-10 pb-16">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/25">
              <Shield className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-100">Admin</h1>
              <p className="text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
                Workspace overview: net checkout after Stripe fees, cumulative usage ledger margin, and registered users.
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <MetricCard
            title="Net purchases (after Stripe fees)"
            subtitle="Sum of charged amounts minus Stripe fees (EUR)."
            loading={metricsQuery.isLoading}
            error={metricsQuery.isError}
            value={
              metricsQuery.data != null ? formatEur(metricsQuery.data.netPurchaseCents, true) : null
            }
          />
          <TokenUsageLedgerCard
            loading={metricsQuery.isLoading}
            error={metricsQuery.isError}
            data={metricsQuery.data}
            formatUsd={formatUsdLedger}
          />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-slate-100">Users</h2>
            <p className="text-sm text-slate-500 mt-0.5">All accounts (newest first).</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-panel/40 ring-1 ring-white/5">
            <table className="w-full text-sm text-left min-w-[720px]">
              <thead>
                <tr className="border-b border-border bg-surface/70 text-slate-500">
                  <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">User ID</th>
                  <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Email</th>
                  <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Display name</th>
                  <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Tokens</th>
                  <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Joined</th>
                  <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {usersQuery.isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                      Loading users…
                    </td>
                  </tr>
                ) : usersQuery.isError ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-red-400/90">
                      Could not load users.
                    </td>
                  </tr>
                ) : (usersQuery.data?.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  usersQuery.data!.map((row, i) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "transition-colors hover:bg-surface/50",
                        i % 2 === 1 ? "bg-surface/25" : "bg-transparent",
                      )}
                    >
                      <td className="px-5 py-3.5 text-slate-500 font-mono text-xs break-all max-w-[8rem] md:max-w-none">
                        {row.id}
                      </td>
                      <td className="px-5 py-3.5 text-slate-200">{row.email}</td>
                      <td className="px-5 py-3.5 text-slate-400">{row.displayName ?? "—"}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                            row.role === "ADMIN"
                              ? "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/25"
                              : "bg-surface text-slate-400 ring-1 ring-border",
                          )}
                        >
                          {row.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono tabular-nums text-slate-300">{row.tokenBalance}</td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {user?.id === row.id ? (
                          <span className="text-xs text-slate-600">—</span>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-400/90 hover:text-red-300 hover:bg-red-500/10"
                            aria-label={`Remove user ${row.email}`}
                            onClick={() => setUserPendingDelete(row)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <ConfirmDialog
          open={userPendingDelete != null}
          title="Remove user?"
          description={
            userPendingDelete
              ? `Permanently delete ${userPendingDelete.email} and all figures, plus every file stored for them in Google Cloud Storage. This cannot be undone.`
              : undefined
          }
          confirmLabel="Remove user"
          confirmLoading={deleteUser.isPending}
          confirmLoadingLabel="Removing…"
          danger
          onCancel={() => {
            if (!deleteUser.isPending) setUserPendingDelete(null);
          }}
          onConfirm={confirmRemoveUser}
        />
      </div>
    </div>
  );
}

function MetricCard({
  title,
  subtitle,
  value,
  loading,
  error,
}: {
  title: string;
  subtitle: string;
  value: string | null;
  loading: boolean;
  error: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-panel/80 ring-1 ring-white/5 p-5 md:p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{subtitle}</p>
      <p className="mt-4 text-2xl font-semibold tabular-nums tracking-tight text-slate-100">
        {loading ? "…" : error ? "—" : value}
      </p>
    </div>
  );
}

function TokenUsageLedgerCard({
  loading,
  error,
  data,
  formatUsd,
}: {
  loading: boolean;
  error: boolean;
  data: AdminMetricsDto | undefined;
  formatUsd: (n: number) => string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-panel/80 ring-1 ring-white/5 p-5 md:p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Token usage (ledger)</p>
      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
        Totals over all <code className="text-slate-500">TokenUsage</code> rows (USD-equivalent units).
      </p>
      {loading || error || !data ? (
        <p className="mt-4 text-2xl font-semibold tabular-nums tracking-tight text-slate-100">
          {loading ? "…" : "—"}
        </p>
      ) : (
        <dl className="mt-4 space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <dt className="text-xs text-slate-500">Σ price</dt>
            <dd className="text-lg font-semibold tabular-nums text-slate-100">{formatUsd(data.tokenUsagePriceTotal)}</dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <dt className="text-xs text-slate-500">Σ priceOriginal</dt>
            <dd className="text-lg font-semibold tabular-nums text-slate-200">{formatUsd(data.tokenUsagePriceOriginalTotal)}</dd>
          </div>
          <div className="border-t border-border/80 pt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <dt className="text-xs font-medium text-violet-300/90">Net margin (Σ price − Σ priceOriginal)</dt>
            <dd className="text-xl font-semibold tabular-nums text-violet-200">{formatUsd(data.tokenUsageMarginTotal)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
