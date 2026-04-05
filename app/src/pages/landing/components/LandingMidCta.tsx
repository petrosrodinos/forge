import { Link } from "react-router-dom";
import { cn } from "@/utils/cn";
import { LANDING_MID_CTA } from "@/pages/landing/constants";

export function LandingMidCta() {
  return (
    <section
      className="relative z-10 border-t border-border/60 bg-gradient-to-br from-accent/10 via-panel/40 to-transparent py-14 sm:py-16"
      aria-labelledby="landing-mid-cta-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-2xl border border-accent/25 bg-panel/50 px-6 py-8 sm:px-10 sm:py-10">
          <h2
            id="landing-mid-cta-heading"
            className="max-w-2xl font-sans text-xl font-bold tracking-tight text-slate-50 sm:text-2xl"
          >
            {LANDING_MID_CTA.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            {LANDING_MID_CTA.body}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/register"
              className={cn(
                "inline-flex items-center justify-center rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white",
                "transition-colors hover:bg-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-light",
              )}
            >
              {LANDING_MID_CTA.primary}
            </Link>
            <Link
              to="/pricing"
              className={cn(
                "inline-flex items-center justify-center rounded-md border border-border bg-panel/70 px-5 py-2.5 text-sm font-medium text-slate-300",
                "transition-colors hover:border-slate-600 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500",
              )}
            >
              {LANDING_MID_CTA.secondary}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
