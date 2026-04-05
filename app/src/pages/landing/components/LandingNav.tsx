import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/use-auth.hooks";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/utils/cn";
import {
  LANDING_BRAND,
  LANDING_NAV_ANCHORS,
  LANDING_NAV_DASHBOARD,
} from "@/pages/landing/constants";

export function LandingNav() {
  const path = useLocation().pathname;
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-panel/80 backdrop-blur-md supports-[backdrop-filter]:bg-panel/65">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          to="/"
          className="font-sans text-sm font-semibold tracking-tight text-accent-light transition-colors hover:text-slate-100"
        >
          {LANDING_BRAND}
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2" aria-label="Marketing">
          {path === "/" &&
            LANDING_NAV_ANCHORS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-md px-2 py-1.5 text-xs text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-200 sm:px-3"
              >
                {item.label}
              </a>
            ))}
          <Link
            to="/pricing"
            className="rounded-md px-3 py-1.5 text-xs text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
          >
            Pricing
          </Link>
          {loading ? (
            <div className="flex h-9 min-w-[5.5rem] items-center justify-center px-2" aria-busy="true" aria-label="Loading account">
              <Spinner className="h-4 w-4 text-slate-500" />
            </div>
          ) : user ? (
            <Link
              to="/forge"
              className={cn(
                "rounded-md border border-accent/45 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent-light transition-colors",
                "hover:bg-accent/20",
                path === "/forge" && "active-mode-btn border-accent/45",
              )}
            >
              {LANDING_NAV_DASHBOARD}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs transition-colors",
                  path === "/login"
                    ? "border border-accent/45 bg-accent/15 font-medium text-accent-light"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                )}
              >
                Log in
              </Link>
              <Link
                to="/register"
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  path === "/register"
                    ? "active-mode-btn border-accent/60 text-accent-light"
                    : "border-accent/45 bg-accent/10 text-accent-light hover:bg-accent/20",
                )}
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
