import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Box, Coins, Menu, MoreHorizontal } from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/use-auth.hooks";
import { useBalance } from "@/features/billing/hooks/use-billing.hooks";
import { useForgeStore } from "@/store/forgeStore";
import { cn } from "@/utils/cn";
import { TopBarUserMenu } from "@/components/layouts/TopBarUserMenu";
import { PRICING_NAV_PATH } from "@/pages/landing/constants";

type DashboardMobileMenuProps = {
  isForge: boolean;
  onForgeNav: () => void;
  onPricingNavClick: (e: MouseEvent<HTMLAnchorElement>) => void;
};

function DashboardMobileMenu({ isForge, onForgeNav, onPricingNavClick }: DashboardMobileMenuProps) {
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative shrink-0 sm:hidden" ref={containerRef}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu" aria-controls="dashboard-nav-mobile-menu" aria-label={open ? "Close menu" : "Open menu"} className={cn("p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors", open && "text-slate-200 bg-white/5")}>
        <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden />
      </button>
      {open && (
        <div id="dashboard-nav-mobile-menu" role="menu" className="absolute right-0 top-full mt-1 min-w-[11rem] max-w-[min(18rem,calc(100vw-1rem))] max-h-[min(70vh,calc(100dvh-4rem))] overflow-y-auto rounded-md border border-border bg-panel py-1 shadow-lg z-50">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onForgeNav();
            }}
            className={cn("w-full text-left px-3 py-2.5 text-xs border-b border-border transition-colors", isForge ? "bg-accent/15 text-accent-light font-medium" : "text-slate-300 hover:bg-white/5 hover:text-slate-100")}
          >
            Studio
          </button>
          <Link
            to={PRICING_NAV_PATH}
            role="menuitem"
            onClick={(e) => {
              setOpen(false);
              onPricingNavClick(e);
            }}
            className="block px-3 py-2.5 text-xs text-slate-300 transition-colors hover:bg-white/5 hover:text-slate-100"
          >
            Pricing
          </Link>
          <Link to="/settings/billing" role="menuitem" onClick={() => setOpen(false)} className="block px-3 py-2.5 text-xs text-slate-300 hover:bg-white/5 hover:text-slate-100 border-t border-border">
            Buy tokens
          </Link>
        </div>
      )}
    </div>
  );
}

/** Top bar for authenticated app routes (forge, settings). */
export function DashboardNav() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: billingBalance } = useBalance({ enabled: !!user });
  const { figurePanelOpen, setFigurePanelOpen } = useForgeStore();

  const isForge = location.pathname === "/forge" || location.pathname.startsWith("/forge/");
  const isProjectForge = /^\/forge\/[^/]+$/.test(location.pathname);

  if (!user) return null;

  function handleForgeClick() {
    if (!isForge) navigate("/forge");
  }

  function handlePricingNavClick(e: MouseEvent<HTMLAnchorElement>) {
    if (location.pathname === "/pricing") {
      e.preventDefault();
      document.getElementById("token-packs")?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", PRICING_NAV_PATH);
    }
  }

  return (
    <header className="h-12 flex items-center gap-1.5 sm:gap-3 px-2 sm:px-4 border-b border-border bg-panel shrink-0 min-w-0">
      {isProjectForge && (
        <button type="button" onClick={() => setFigurePanelOpen(!figurePanelOpen)} className="md:hidden p-1.5 -ml-0.5 shrink-0 text-slate-400 hover:text-slate-200 transition-colors" aria-label="Toggle figures panel">
          <Menu size={16} />
        </button>
      )}
      <Link to="/" className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-accent-light truncate min-w-0 shrink hover:text-slate-100 transition-colors">
        <Box size={15} strokeWidth={1.8} className="shrink-0" aria-hidden />
        <span className="truncate">Forge</span>
      </Link>

      <nav className="hidden sm:flex items-center gap-1 shrink-0" aria-label="App">
        <button type="button" onClick={handleForgeClick} className={cn("text-xs px-3 py-1.5 rounded transition-colors border", isForge ? "active-mode-btn" : "border-transparent text-slate-400 hover:text-slate-200")}>
          Studio
        </button>
      </nav>

      <div className="ml-auto flex items-center gap-1 sm:gap-3 min-w-0 shrink-0">
        <span className="flex items-center gap-0.5 sm:gap-1 text-[11px] sm:text-xs text-slate-400 tabular-nums max-w-[5.5rem] sm:max-w-none min-w-0">
          <Coins size={12} className="shrink-0" aria-hidden />
          <span className="font-mono text-accent-light truncate">{billingBalance?.balance ?? "—"}</span>
          <span className="hidden min-[400px]:inline sm:inline text-slate-500 shrink-0">tokens</span>
        </span>
        <Link to="/settings/billing" className="hidden sm:inline text-xs text-accent-light hover:underline whitespace-nowrap">
          Buy tokens
        </Link>
        <DashboardMobileMenu isForge={isForge} onForgeNav={handleForgeClick} onPricingNavClick={handlePricingNavClick} />
        <TopBarUserMenu />
      </div>
    </header>
  );
}
