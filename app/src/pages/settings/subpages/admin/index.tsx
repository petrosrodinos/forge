import { useState } from "react";
import { Pencil, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/hooks/use-auth.hooks";
import {
  useAdminMetrics,
  useAdminUserPurchases,
  useAdminUsers,
  useDeleteAdminUser,
  useUpdateAdminUser,
} from "@/features/admin/hooks/use-admin.hooks";
import type {
  AdminMetricsDto,
  AdminUserRowDto,
  AdminUserPurchaseDto,
  AdminUserUpdateInput,
} from "@/features/admin/interfaces/admin.interfaces";
import { formatEur } from "@/features/billing/utils/format";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { OptionsMenu } from "@/components/ui/OptionsMenu";
import { cn } from "@/utils/cn";

function formatUsdLedger(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 }).format(value);
}

type AdminUserDraft = {
  email: string;
  displayName: string;
  role: "USER" | "ADMIN";
  tokenBalance: string;
};

function rowToDraft(row: AdminUserRowDto): AdminUserDraft {
  return {
    email: row.email,
    displayName: row.displayName ?? "",
    role: row.role,
    tokenBalance: String(row.tokenBalance),
  };
}

export default function SettingsAdminPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const metricsQuery = useAdminMetrics(isAdmin);
  const usersQuery = useAdminUsers(isAdmin);
  const deleteUser = useDeleteAdminUser();
  const updateUser = useUpdateAdminUser();
  const [userPendingDelete, setUserPendingDelete] = useState<AdminUserRowDto | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "generations" | "purchases">("users");
  const [purchaseSubjectId, setPurchaseSubjectId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<AdminUserDraft | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const purchasesQuery = useAdminUserPurchases(purchaseSubjectId, isAdmin && activeTab === "purchases");

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

  const selectedUser = usersQuery.data?.find((u) => u.id === selectedUserId) ?? null;

  const openUserEditor = (row: AdminUserRowDto) => {
    setSelectedUserId(row.id);
    setEditDraft(rowToDraft(row));
    setEditModalOpen(true);
  };

  const saveSelectedUser = () => {
    if (!selectedUser || !editDraft) return;
    const email = editDraft.email.trim();
    if (!email) {
      toast.error("Email is required");
      return;
    }

    const tokenBalance = Number(editDraft.tokenBalance);
    if (!Number.isInteger(tokenBalance) || tokenBalance < 0) {
      toast.error("Tokens must be a non-negative integer");
      return;
    }

    const body: AdminUserUpdateInput = {
      email,
      displayName: editDraft.displayName.trim() ? editDraft.displayName.trim() : null,
      role: editDraft.role,
      tokenBalance,
    };

    updateUser.mutate(
      { userId: selectedUser.id, body },
      {
        onSuccess: () => {
          toast.success(`Updated ${body.email}`);
          setEditModalOpen(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Could not update user");
        },
      },
    );
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
            secondary={
              metricsQuery.data != null
                ? {
                    label: "Total Stripe fees",
                    value: formatEur(metricsQuery.data.totalStripeFeeCents, true),
                  }
                : null
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
          <div className="inline-flex rounded-lg border border-border bg-surface/30 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                activeTab === "users" ? "bg-violet-500/20 text-violet-200" : "text-slate-400 hover:text-slate-200",
              )}
            >
              Users
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("generations")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                activeTab === "generations" ? "bg-violet-500/20 text-violet-200" : "text-slate-400 hover:text-slate-200",
              )}
            >
              Generations
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("purchases")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                activeTab === "purchases" ? "bg-violet-500/20 text-violet-200" : "text-slate-400 hover:text-slate-200",
              )}
            >
              Purchases
            </button>
          </div>

          {activeTab === "users" ? (
            <>
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
                            <OptionsMenu
                              menuLabel={`User actions for ${row.email}`}
                              items={[
                                {
                                  id: "edit",
                                  label: "Edit",
                                  icon: Pencil,
                                  onSelect: () => openUserEditor(row),
                                },
                                {
                                  id: "remove",
                                  label: "Remove",
                                  icon: Trash2,
                                  destructive: true,
                                  disabled: user?.id === row.id,
                                  onSelect: () => setUserPendingDelete(row),
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : activeTab === "generations" ? (
            <GenerationsTab loading={metricsQuery.isLoading} error={metricsQuery.isError} data={metricsQuery.data} />
          ) : (
            <PurchasesTab
              users={usersQuery.data}
              usersLoading={usersQuery.isLoading}
              usersError={usersQuery.isError}
              selectedUserId={purchaseSubjectId}
              onSelectUserId={(id) => setPurchaseSubjectId(id)}
              purchasesQuery={purchasesQuery}
            />
          )}
        </section>

        <Modal
          open={editModalOpen}
          onClose={() => {
            if (!updateUser.isPending) setEditModalOpen(false);
          }}
          title="Edit user"
          panelClassName="max-w-xl"
          contentClassName="items-start"
        >
          <EditUserForm
            user={selectedUser}
            draft={editDraft}
            saving={updateUser.isPending}
            onDraftChange={setEditDraft}
            onSave={saveSelectedUser}
          />
        </Modal>

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

function GenerationsTab({
  loading,
  error,
  data,
}: {
  loading: boolean;
  error: boolean;
  data: AdminMetricsDto | undefined;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-slate-100">Generations</h2>
        <p className="text-sm text-slate-500 mt-0.5">Total generated assets in the workspace.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CountCard title="Generated images" value={loading || error || !data ? null : data.generatedImagesCount} />
        <CountCard title="Generated meshes" value={loading || error || !data ? null : data.generatedMeshesCount} />
        <CountCard title="Generated rigs" value={loading || error || !data ? null : data.generatedRigsCount} />
        <CountCard title="Generated animations" value={loading || error || !data ? null : data.generatedAnimationsCount} />
      </div>
    </div>
  );
}

function PurchasesTab({
  users,
  usersLoading,
  usersError,
  selectedUserId,
  onSelectUserId,
  purchasesQuery,
}: {
  users: AdminUserRowDto[] | undefined;
  usersLoading: boolean;
  usersError: boolean;
  selectedUserId: string | null;
  onSelectUserId: (id: string | null) => void;
  purchasesQuery: {
    data: AdminUserPurchaseDto[] | undefined;
    isLoading: boolean;
    isError: boolean;
    isFetching: boolean;
  };
}) {
  const hasUsers = (users?.length ?? 0) > 0;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-slate-100">Purchase history</h2>
        <p className="text-sm text-slate-500 mt-0.5">Stripe token pack checkouts per user (newest first).</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between max-w-xl">
        <label className="text-xs font-medium text-slate-400" htmlFor="admin-purchase-user">
          User
        </label>
        <select
          id="admin-purchase-user"
          className="h-10 w-full sm:max-w-md rounded-lg border border-border bg-panel px-3 text-sm text-slate-200 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 disabled:opacity-50"
          disabled={usersLoading || usersError || !hasUsers}
          value={selectedUserId ?? ""}
          onChange={(e) => onSelectUserId(e.target.value.length > 0 ? e.target.value : null)}
        >
          {!hasUsers && !usersLoading ? (
            <option value="">No users</option>
          ) : (
            <>
              <option value="">All users</option>
              {(users ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                  {u.displayName ? ` (${u.displayName})` : ""}
                </option>
              ))}
            </>
          )}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-panel/40 ring-1 ring-white/5">
        <table className="w-full text-sm text-left min-w-[980px]">
          <thead>
            <tr className="border-b border-border bg-surface/70 text-slate-500">
              <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Date</th>
              <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">User email</th>
              <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Pack</th>
              <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider text-right">Tokens</th>
              <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider text-right">Charged</th>
              <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider text-right">Stripe fee</th>
              <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider text-right">Net</th>
              <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Session</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {usersLoading ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                  Loading users…
                </td>
              </tr>
            ) : usersError ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-red-400/90">
                  Could not load users.
                </td>
              </tr>
            ) : purchasesQuery.isLoading || purchasesQuery.isFetching ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                  Loading purchases…
                </td>
              </tr>
            ) : purchasesQuery.isError ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-red-400/90">
                  Could not load purchase history.
                </td>
              </tr>
            ) : (purchasesQuery.data?.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                  {selectedUserId ? "No purchases for this user." : "No purchases found."}
                </td>
              </tr>
            ) : (
              purchasesQuery.data!.map((row, i) => (
                <PurchaseRow key={row.id} row={row} altRow={i % 2 === 1} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PurchaseRow({ row, altRow }: { row: AdminUserPurchaseDto; altRow: boolean }) {
  const fee = row.stripeFeeCents ?? 0;
  const net = row.amountCents - fee;
  return (
    <tr className={cn("transition-colors hover:bg-surface/50", altRow ? "bg-surface/25" : "bg-transparent")}>
      <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">
        {new Date(row.createdAt).toLocaleString()}
      </td>
      <td className="px-5 py-3.5 text-slate-200">{row.userEmail}</td>
      <td className="px-5 py-3.5 text-slate-200">
        <span className="font-medium">{row.packName}</span>
        <span className="block text-xs text-slate-500 font-mono mt-0.5">{row.packId}</span>
      </td>
      <td className="px-5 py-3.5 text-right font-mono tabular-nums text-slate-300">{row.tokens.toLocaleString()}</td>
      <td className="px-5 py-3.5 text-right tabular-nums text-slate-200">{formatEur(row.amountCents, true)}</td>
      <td className="px-5 py-3.5 text-right tabular-nums text-slate-400">
        {row.stripeFeeCents != null ? formatEur(row.stripeFeeCents, true) : "—"}
      </td>
      <td className="px-5 py-3.5 text-right tabular-nums text-slate-200">{formatEur(net, true)}</td>
      <td className="px-5 py-3.5 text-slate-500 font-mono text-xs break-all max-w-[14rem]">{row.stripeSessionId}</td>
    </tr>
  );
}

function CountCard({ title, value }: { title: string; value: number | null }) {
  return (
    <div className="rounded-xl border border-border bg-panel/80 ring-1 ring-white/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-slate-100">
        {value == null ? "…" : value.toLocaleString()}
      </p>
    </div>
  );
}

function EditUserForm({
  user,
  draft,
  saving,
  onDraftChange,
  onSave,
}: {
  user: AdminUserRowDto | null;
  draft: AdminUserDraft | null;
  saving: boolean;
  onDraftChange: (draft: AdminUserDraft) => void;
  onSave: () => void;
}) {
  if (!user || !draft) {
    return (
      <div className="w-full rounded-xl border border-border bg-panel/40 ring-1 ring-white/5 p-5">
        <p className="text-sm text-slate-400">No user selected.</p>
      </div>
    );
  }

  const isDirty =
    draft.email.trim() !== user.email ||
    draft.displayName.trim() !== (user.displayName ?? "") ||
    draft.role !== user.role ||
    Number(draft.tokenBalance) !== user.tokenBalance;

  return (
    <div className="w-full space-y-4">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-slate-100">Edit {user.email}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{user.id}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Email"
          value={draft.email}
          onChange={(e) => onDraftChange({ ...draft, email: e.target.value })}
          placeholder="Email"
        />
        <Input
          label="Display name"
          value={draft.displayName}
          onChange={(e) => onDraftChange({ ...draft, displayName: e.target.value })}
          placeholder="Display name"
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400 font-medium">Role</label>
          <select
            value={draft.role}
            onChange={(e) => onDraftChange({ ...draft, role: e.target.value as "USER" | "ADMIN" })}
            className="h-10 bg-panel border border-border rounded px-3 text-sm text-slate-200 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
          >
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
        <Input
          label="Token balance"
          type="number"
          min={0}
          step={1}
          value={draft.tokenBalance}
          onChange={(e) => onDraftChange({ ...draft, tokenBalance: e.target.value })}
          placeholder="0"
        />
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="secondary" onClick={onSave} disabled={!isDirty || saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  subtitle,
  value,
  secondary,
  loading,
  error,
}: {
  title: string;
  subtitle: string;
  value: string | null;
  secondary?: { label: string; value: string } | null;
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
      {secondary != null && !loading && !error ? (
        <p className="mt-3 text-sm text-slate-400 tabular-nums">
          <span className="text-slate-500">{secondary.label}: </span>
          {secondary.value}
        </p>
      ) : null}
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
