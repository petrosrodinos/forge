import { Link } from "react-router-dom";
import { LandingNav } from "@/pages/landing/components/LandingNav";
import { LandingHeroVisual } from "@/pages/landing/components/LandingHeroVisual";
import { LandingFeatureSections } from "@/pages/landing/components/LandingFeatureSections";
import { LandingFooter } from "@/pages/landing/components/LandingFooter";
import { LandingHead } from "@/pages/landing/components/LandingHead";
import { LandingUseCases } from "@/pages/landing/components/LandingUseCases";
import { LandingHowItWorks } from "@/pages/landing/components/LandingHowItWorks";
import { LandingMidCta } from "@/pages/landing/components/LandingMidCta";
import { LandingTokenPacks } from "@/pages/landing/components/LandingTokenPacks";
import { cn } from "@/utils/cn";
import { LANDING_CTA_PRIMARY, LANDING_CTA_SECONDARY, LANDING_HERO_BADGE, LANDING_HERO_SUBTITLE, LANDING_HERO_TITLE, LANDING_SIGN_IN_LINK, LANDING_SIGN_IN_PROMPT } from "@/pages/landing/constants";

export default function LandingPage() {
  return (
    <div className="landing-mesh relative flex min-h-svh flex-col text-slate-200">
      <LandingHead />
      <a href="#main-content" className={cn("absolute left-4 top-0 z-[100] -translate-y-[120%] rounded-md bg-accent px-4 py-2 text-sm font-medium text-white", "shadow-lg transition-transform focus:translate-y-4 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-white")}>
        Skip to main content
      </a>
      <LandingNav />
      <main id="main-content" tabIndex={-1} className="relative flex flex-1 flex-col pb-24 outline-none">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-accent/5 blur-3xl" />
          <div className="absolute -right-24 bottom-1/4 h-64 w-64 rounded-full bg-accent-light/5 blur-3xl" />
        </div>
        <section className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-4 py-12 sm:gap-16 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20" aria-labelledby="hero-title">
          <div className="max-w-xl lg:max-w-none">
            <p className={cn("landing-rise font-mono text-xs font-medium uppercase tracking-widest text-accent-light/90")}>{LANDING_HERO_BADGE}</p>
            <h1 id="hero-title" className="landing-rise landing-rise-delay-1 mt-4 font-sans text-3xl font-bold leading-[1.08] tracking-tight text-slate-50 sm:text-4xl sm:leading-[1.06] lg:text-[2.75rem]">
              {LANDING_HERO_TITLE}
            </h1>
            <p className="landing-rise landing-rise-delay-2 mt-5 text-sm leading-relaxed text-slate-400 sm:text-base sm:leading-relaxed">{LANDING_HERO_SUBTITLE}</p>
            <div className="landing-rise landing-rise-delay-3 mt-8 flex flex-wrap items-center gap-3">
              <Link to="/register" className={cn("inline-flex items-center justify-center rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white", "transition-colors hover:bg-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-light")}>
                {LANDING_CTA_PRIMARY}
              </Link>
              <a href="#use-cases" className={cn("inline-flex items-center justify-center rounded-md border border-border bg-panel/70 px-5 py-2.5 text-sm font-medium text-slate-300", "transition-colors hover:border-slate-600 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500")}>
                {LANDING_CTA_SECONDARY}
              </a>
            </div>
            <p className="landing-rise landing-rise-delay-4 mt-6 font-mono text-xs text-slate-600">
              {LANDING_SIGN_IN_PROMPT}{" "}
              <Link to="/login" className="text-accent-light/90 underline-offset-2 hover:underline">
                {LANDING_SIGN_IN_LINK}
              </Link>
            </p>
          </div>
          <LandingHeroVisual />
        </section>
        <LandingFeatureSections />
        <LandingUseCases />
        <LandingHowItWorks />
        <LandingTokenPacks />
        <LandingMidCta />
      </main>
      <LandingFooter />
    </div>
  );
}
