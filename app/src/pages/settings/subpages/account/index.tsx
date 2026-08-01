import { Link } from "react-router-dom";
import { Coins, Fingerprint, UserRound } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/features/auth/hooks/use-auth.hooks";
import { AccountDetailRow } from "./components/AccountDetailRow";
import { AccountUpdateForm } from "./components/AccountUpdateForm";

function accountInitials(displayName: string | null | undefined, email: string | undefined): string {
  const n = displayName?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

export default function SettingsAccountPage() {
  const { user, loading } = useAuth();

  return (
    <div className="relative min-h-full">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-accent/12 via-accent/5 to-transparent" aria-hidden />
      <div className="relative p-6 md:p-8 max-w-2xl space-y-10 pb-16">
        <header className="flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-light ring-1 ring-accent/25">
            <UserRound className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-100">Account</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-lg leading-relaxed">Profile details tied to your workspace. Sign-in and billing use the same identity.</p>
          </div>
        </header>

        {loading ? (
          <div className="space-y-6" aria-busy aria-label="Loading account">
            <div className="flex items-center gap-5">
              <Skeleton className="h-20 w-20 shrink-0 rounded-2xl" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-48 rounded-md" />
                <Skeleton className="h-4 w-64 max-w-full rounded-md" />
              </div>
            </div>
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            <section className="relative overflow-hidden rounded-2xl border border-border bg-panel ring-1 ring-white/5 shadow-lg shadow-black/20">
              <div className="pointer-events-none absolute -left-12 -top-16 h-40 w-40 rounded-full bg-accent/15 blur-3xl" aria-hidden />
              <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/30 to-accent/10 text-xl font-bold tracking-tight text-accent-light ring-2 ring-accent/25" aria-hidden>
                  {accountInitials(user?.displayName, user?.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-slate-100 truncate">{user?.displayName?.trim() || "Your account"}</h2>
                  <p className="text-sm text-slate-500 mt-1 truncate">{user?.email ?? "—"}</p>
                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">Display name is shown in the app; email is used for sign-in.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold tracking-tight text-slate-100 mb-3">Profile</h2>
              {user ? <AccountUpdateForm user={user} /> : null}
            </section>

            <section>
              <h2 className="text-sm font-semibold tracking-tight text-slate-100 mb-3">Details</h2>
              <div className="overflow-hidden rounded-2xl border border-border bg-panel/95 ring-1 ring-white/5 divide-y divide-border/80">
                <AccountDetailRow icon={Fingerprint} label="User ID">
                  <code className="text-xs font-mono text-slate-400 break-all">{user?.id ?? "—"}</code>
                </AccountDetailRow>
                <AccountDetailRow icon={Coins} label="Token balance">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono text-base font-semibold tabular-nums text-accent-light">{user != null ? user.tokenBalance : "—"}</span>
                    <span className="text-slate-500">tokens</span>
                    <Link to="/settings/billing" className="text-xs font-medium text-accent-light hover:text-accent-light/90 underline underline-offset-2">
                      Buy tokens
                    </Link>
                  </div>
                </AccountDetailRow>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
