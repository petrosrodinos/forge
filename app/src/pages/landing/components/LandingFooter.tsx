import { Link } from "react-router-dom";
import { LANDING_BRAND, LANDING_FOOTER_TAGLINE } from "@/pages/landing/constants";

export function LandingFooter() {
  return (
    <footer className="relative z-10 border-t border-border/60 bg-surface/80 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-sans text-sm font-semibold text-slate-200">{LANDING_BRAND}</p>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">{LANDING_FOOTER_TAGLINE}</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
          <a href="#features" className="text-slate-500 transition-colors hover:text-accent-light">
            Features
          </a>
          <a href="#use-cases" className="text-slate-500 transition-colors hover:text-accent-light">
            Use cases
          </a>
          <Link to="/pricing" className="text-slate-500 transition-colors hover:text-accent-light">
            Pricing
          </Link>
          <Link to="/login" className="text-slate-500 transition-colors hover:text-accent-light">
            Log in
          </Link>
          <Link to="/register" className="text-slate-500 transition-colors hover:text-accent-light">
            Create account
          </Link>
        </div>
      </div>
    </footer>
  );
}
