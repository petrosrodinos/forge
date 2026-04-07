import {
  Boxes,
  Cpu,
  Layers3,
  Sparkles,
  UserRound,
  Wand2,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { LANDING_FEATURE_SECTIONS } from "@/pages/landing/constants";

const SECTION_ICONS = [Sparkles, Boxes, UserRound, Layers3] as const;
const ITEM_ICONS = [Wand2, Cpu, Boxes, UserRound, Sparkles, Layers3, Wand2, Cpu] as const;

export function LandingFeatureSections() {
  return (
    <section
      id="features"
      className="relative z-10 scroll-mt-20 border-t border-border/60 bg-panel/20 py-16 sm:py-20"
      aria-labelledby="landing-features-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2
          id="landing-features-heading"
          className="font-sans text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl"
        >
          AI 3D game assets in four focused areas
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base">
          Everything below maps to how realtime teams actually ship: ideation, geometry, rigs and motion, then
          variants at scale—optimized for Unity, Unreal, mobile, and mod workflows.
        </p>

        <div className="mt-14 flex flex-col gap-16 sm:gap-20">
          {LANDING_FEATURE_SECTIONS.map((section, si) => {
            const SectionIcon = SECTION_ICONS[si] ?? Layers3;
            return (
              <div key={section.id} id={section.id} className="scroll-mt-24">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface/80 text-accent-light"
                    aria-hidden
                  >
                    <SectionIcon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-sans text-lg font-semibold tracking-tight text-slate-100 sm:text-xl">
                      {section.title}
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">{section.subtitle}</p>
                  </div>
                </div>
                <ul className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5">
                  {section.items.map((item, ii) => {
                    const iconIndex = si * 2 + ii;
                    const Icon = ITEM_ICONS[iconIndex % ITEM_ICONS.length];
                    return (
                      <li
                        key={item.title}
                        className={cn(
                          "rounded-xl border border-border/80 bg-panel/50 p-5 transition-colors",
                          "hover:border-accent/35 hover:bg-panel/80",
                        )}
                      >
                        <div className="mb-3 inline-flex rounded-lg border border-border bg-surface/80 p-2 text-accent-light">
                          <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                        </div>
                        <h4 className="font-sans text-sm font-semibold text-slate-100">{item.title}</h4>
                        <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:text-sm">{item.body}</p>
                        <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-slate-600">
                          {item.keywords}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
