import { Coins, Menu } from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/use-auth.hooks";
import { useBalance } from "@/features/billing/hooks/use-billing.hooks";
import { useForgeStore } from "@/store/forgeStore";
import { cn } from "@/utils/cn";
import { TopBarUserMenu } from "@/components/layouts/TopBarUserMenu";

export function TopBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isPricing = location.pathname === "/pricing";
  const { data: billingBalance } = useBalance({ enabled: !!user && !isPricing });
  const { chatPanelOpen, setChatPanelOpen, figurePanelOpen, setFigurePanelOpen } = useForgeStore();

  const isForge = location.pathname === "/forge";
  /** Public pricing: no balance, billing, or account menu (logged-in users get a single app link). */
  const hideUserChrome = isPricing;

  function handleForgeClick() {
    if (!isForge) {
      navigate("/forge");
    } else {
      setChatPanelOpen(!chatPanelOpen);
    }
  }

  return (
    <header className="h-12 flex items-center gap-4 px-4 border-b border-border bg-panel shrink-0">
      {isForge && (
        <button
          onClick={() => setFigurePanelOpen(!figurePanelOpen)}
          className="md:hidden p-1.5 -ml-1 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Toggle figures panel"
        >
          <Menu size={16} />
        </button>
      )}
      <span className="text-sm font-semibold text-accent-light mr-2">3D Figures</span>

      <nav className="flex items-center gap-1">
        {user && (
          <button
            type="button"
            onClick={handleForgeClick}
            className={cn(
              "text-xs px-3 py-1.5 rounded transition-colors border",
              isForge ? "active-mode-btn" : "border-transparent text-slate-400 hover:text-slate-200",
            )}
          >
            Forge
          </button>
        )}
        <Link
          to="/pricing"
          className={cn(
            "text-xs px-3 py-1.5 rounded transition-colors border",
            location.pathname === "/pricing"
              ? "active-mode-btn"
              : "border-transparent text-slate-400 hover:text-slate-200",
          )}
        >
          Pricing
        </Link>
      </nav>

      <div className="ml-auto flex items-center gap-3">
        {hideUserChrome ? (
          user ? (
            <Link
              to="/forge"
              className="text-xs px-3 py-1.5 rounded border border-border text-slate-300 hover:bg-white/5 transition-colors"
            >
              Open Forge
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="text-xs px-3 py-1.5 rounded border border-accent/40 text-accent-light hover:bg-accent/10 transition-colors"
              >
                Sign up
              </Link>
            </>
          )
        ) : (
          user && (
            <>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Coins size={12} />
                <span className="font-mono text-accent-light tabular-nums">
                  {billingBalance?.balance ?? "—"}
                </span>
                <span className="text-slate-500">tokens</span>
              </span>
              <Link
                to="/settings/billing"
                className="hidden sm:inline text-xs text-accent-light hover:underline"
              >
                Buy tokens
              </Link>
              <TopBarUserMenu />
            </>
          )
        )}
      </div>
    </header>
  );
}
