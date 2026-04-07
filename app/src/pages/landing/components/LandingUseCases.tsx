import { Gamepad2, Smartphone, Timer, Users, Waypoints } from "lucide-react";
import { cn } from "@/utils/cn";
import { LANDING_USE_CASES } from "@/pages/landing/constants";

const ICONS = [Gamepad2, Users, Smartphone, Waypoints, Timer] as const;

export function LandingUseCases() {
  return (
    <section
      id="use-cases"
      className="relative z-10 scroll-mt-20 border-t border-border/60 py-16 sm:py-20"
      aria-labelledby="landing-use-cases-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2
          id="landing-use-cases-heading"
          className="font-sans text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl"
        >
          Built for indies, studios, and mod teams
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base">
          From Unity and Unreal projects to mobile skins and jam deadlines—the same AI game asset generator
          workflow scales from solo devs to distributed art teams.
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {LANDING_USE_CASES.map((item, i) => {
            const Icon = ICONS[i] ?? Gamepad2;
            return (
              <li
                key={item.title}
                className={cn(
                  "rounded-xl border border-border/80 bg-panel/40 p-5",
                  "transition-colors hover:border-accent/30 hover:bg-panel/70",
                )}
              >
                <div className="mb-3 inline-flex rounded-lg border border-border bg-surface/80 p-2 text-accent-light">
                  <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                </div>
                <h3 className="font-sans text-sm font-semibold text-slate-100">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:text-sm">{item.body}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
