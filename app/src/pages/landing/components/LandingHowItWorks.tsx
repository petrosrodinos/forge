import { LANDING_HOW_IT_WORKS } from "@/pages/landing/constants";

export function LandingHowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative z-10 scroll-mt-20 border-t border-border/60 bg-panel/20 py-16 sm:py-20"
      aria-labelledby="landing-how-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2
          id="landing-how-heading"
          className="font-sans text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl"
        >
          How it works
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base">
          Four steps from brief to rigged, animated geometry—optimized for AI character generator workflows
          that need review gates, not black-box surprises.
        </p>
        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {LANDING_HOW_IT_WORKS.map((step, index) => (
            <li key={step.title} className="relative flex gap-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 font-mono text-sm font-semibold text-accent-light"
                aria-hidden
              >
                {index + 1}
              </div>
              <div className="min-w-0 pt-0.5">
                <h3 className="font-sans text-sm font-semibold text-slate-100">{step.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:text-sm">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
