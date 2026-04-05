import { useEffect, useRef, useState } from "react";
import { Coins, Menu, MessageSquare, MoreHorizontal } from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/use-auth.hooks";
import { useBalance } from "@/features/billing/hooks/use-billing.hooks";
import { useForgeStore } from "@/store/forgeStore";
import { cn } from "@/utils/cn";
import { TopBarUserMenu } from "@/components/layouts/TopBarUserMenu";

type TopBarMobileNavProps = {
  user: ReturnType<typeof useAuth>["user"];
  isForge: boolean;
  isPricing: boolean;
  hideUserChrome: boolean;
  onForgeNav: () => void;
};

function TopBarMobileNav({
  user,
  isForge,
  isPricing,
  hideUserChrome,
  onForgeNav,
}: TopBarMobileNavProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div className="relative shrink-0 sm:hidden" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Site menu"
        className={cn(
          "p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors",
          open && "text-slate-200 bg-white/5",
        )}
      >
        <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 min-w-[11rem] max-w-[calc(100vw-1rem)] rounded-md border border-border bg-panel py-1 shadow-lg z-50"
        >
          {user && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onForgeNav();
              }}
              className={cn(
                "w-full text-left px-3 py-2 text-xs border-b border-border transition-colors",
                isForge
                  ? "bg-accent/15 text-accent-light font-medium"
                  : "text-slate-300 hover:bg-white/5 hover:text-slate-100",
              )}
            >
              Studio
            </button>
          )}
          <Link
            to="/pricing"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={cn(
              "block px-3 py-2 text-xs transition-colors",
              isPricing
                ? "bg-accent/15 text-accent-light font-medium"
                : "text-slate-300 hover:bg-white/5 hover:text-slate-100",
            )}
          >
            Pricing
          </Link>
          {user && !hideUserChrome && (
            <Link
              to="/settings/billing"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-slate-100 border-t border-border mt-1 pt-2"
            >
              Buy tokens
            </Link>
          )}
          {hideUserChrome && !user && (
            <div className="border-t border-border mt-1 pt-1">
              <Link
                to="/login"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-slate-100"
              >
                Log in
              </Link>
              <Link
                to="/register"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-xs text-accent-light hover:bg-white/5"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isPricing = location.pathname === "/pricing";
  const { data: billingBalance } = useBalance({ enabled: !!user && !isPricing });
  const { chatPanelOpen, setChatPanelOpen, figurePanelOpen, setFigurePanelOpen } = useForgeStore();
  const isDev = import.meta.env.DEV;

  const isForge = location.pathname === "/forge";
  /** Public pricing: no balance, billing, or account menu (logged-in users get a single app link). */
  const hideUserChrome = isPricing;

  function handleForgeClick() {
    if (!isForge) navigate("/forge");
  }

  return (
    <header className="h-12 flex items-center gap-1.5 sm:gap-3 px-2 sm:px-4 border-b border-border bg-panel shrink-0 min-w-0">
      {isForge && (
        <button
          type="button"
          onClick={() => setFigurePanelOpen(!figurePanelOpen)}
          className="md:hidden p-1.5 -ml-0.5 shrink-0 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Toggle figures panel"
        >
          <Menu size={16} />
        </button>
      )}
      {isDev && isForge && user && (
        <button
          type="button"
          onClick={() => setChatPanelOpen(!chatPanelOpen)}
          className={cn(
            "md:hidden p-1.5 shrink-0 transition-colors",
            chatPanelOpen ? "text-accent-light" : "text-slate-400 hover:text-slate-200",
          )}
          aria-label={chatPanelOpen ? "Close chat" : "Open chat"}
        >
          <MessageSquare size={16} aria-hidden />
        </button>
      )}
      <Link
        to="/"
        className="text-xs sm:text-sm font-semibold text-accent-light truncate min-w-0 shrink hover:text-slate-100 transition-colors"
      >
        Forge
      </Link>

      <nav className="hidden sm:flex items-center gap-1 shrink-0">
        {user && (
          <button
            type="button"
            onClick={handleForgeClick}
            className={cn(
              "text-xs px-3 py-1.5 rounded transition-colors border",
              isForge ? "active-mode-btn" : "border-transparent text-slate-400 hover:text-slate-200",
            )}
          >
            Studio
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

      <div className="ml-auto flex items-center gap-1 sm:gap-3 min-w-0 shrink-0">
        {hideUserChrome ? (
          user ? (
            <>
              <Link
                to="/forge"
                className="hidden sm:inline text-xs px-3 py-1.5 rounded border border-border text-slate-300 hover:bg-white/5 transition-colors"
              >
                Open Studio
              </Link>
              <TopBarMobileNav
                user={user}
                isForge={isForge}
                isPricing={isPricing}
                hideUserChrome={hideUserChrome}
                onForgeNav={handleForgeClick}
              />
            </>
          ) : (
            <>
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="text-xs px-3 py-1.5 rounded border border-accent/40 text-accent-light hover:bg-accent/10 transition-colors whitespace-nowrap"
                >
                  Sign up
                </Link>
              </div>
              <TopBarMobileNav
                user={user}
                isForge={isForge}
                isPricing={isPricing}
                hideUserChrome={hideUserChrome}
                onForgeNav={handleForgeClick}
              />
            </>
          )
        ) : user ? (
          <>
            <span className="flex items-center gap-0.5 sm:gap-1 text-[11px] sm:text-xs text-slate-400 tabular-nums max-w-[5.5rem] sm:max-w-none min-w-0">
              <Coins size={12} className="shrink-0" aria-hidden />
              <span className="font-mono text-accent-light truncate">{billingBalance?.balance ?? "—"}</span>
              <span className="hidden min-[400px]:inline sm:inline text-slate-500 shrink-0">tokens</span>
            </span>
            <Link
              to="/settings/billing"
              className="hidden sm:inline text-xs text-accent-light hover:underline whitespace-nowrap"
            >
              Buy tokens
            </Link>
            <TopBarMobileNav
              user={user}
              isForge={isForge}
              isPricing={isPricing}
              hideUserChrome={hideUserChrome}
              onForgeNav={handleForgeClick}
            />
            <TopBarUserMenu />
          </>
        ) : (
          <TopBarMobileNav
            user={null}
            isForge={isForge}
            isPricing={isPricing}
            hideUserChrome={hideUserChrome}
            onForgeNav={handleForgeClick}
          />
        )}
      </div>
    </header>
  );
}
