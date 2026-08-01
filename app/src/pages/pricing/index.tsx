import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/features/auth/hooks/use-auth.hooks";
import { TokenPacksGrid } from "@/features/billing/components/TokenPacksGrid";
import { BILLING_PACK_QUERY_PARAM } from "@/features/billing/constants";
import { useCheckout, usePacks } from "@/features/billing/hooks/use-billing.hooks";
import { usePricingCatalog } from "@/features/pricing/hooks/use-pricing.hooks";
import type { PricingImageModelDto, PricingTrippoModelDto } from "@/features/pricing/interfaces/pricing.interfaces";
import { LANDING_PACKS_SIGNUP_BONUS, LANDING_PACKS_SUBTITLE, LANDING_PACKS_TITLE } from "@/pages/landing/constants";
import { cn } from "@/utils/cn";

const usd = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 3 }).format(amount);

const TRIPPO_ALIAS_IDS = new Set(["image_to_model", "multiview_to_model", "text_to_model"]);

const TRIPPO_CATEGORY_ORDER = [
  "generation",
  "generation_addon",
  "processing",
  "animation",
  "image_generation",
] as const;

const TRIPPO_CATEGORY_LABELS: Record<string, string> = {
  generation: "3D generation",
  generation_addon: "Generation add-ons (H series)",
  processing: "Model processing",
  animation: "Animation",
  image_generation: "Tripo image generation",
};

function trippoDisplayLabel(m: PricingTrippoModelDto) {
  return m.label ?? m.id.replace(/_/g, " ");
}

function groupTrippoModels(models: PricingTrippoModelDto[]) {
  const filtered = models.filter((m) => !TRIPPO_ALIAS_IDS.has(m.id));
  const map = new Map<string, PricingTrippoModelDto[]>();
  for (const m of filtered) {
    const key = m.category ?? "other";
    const list = map.get(key) ?? [];
    list.push(m);
    map.set(key, list);
  }
  const keys = [
    ...TRIPPO_CATEGORY_ORDER.filter((k) => map.has(k)),
    ...[...map.keys()].filter((k) => !(TRIPPO_CATEGORY_ORDER as readonly string[]).includes(k)).sort(),
  ];
  return keys.map((category) => ({
    category,
    label: TRIPPO_CATEGORY_LABELS[category] ?? category,
    models: map.get(category) ?? [],
  }));
}

function groupModelsByProvider(models: PricingImageModelDto[]) {
  const map = new Map<string, PricingImageModelDto[]>();
  for (const m of models) {
    const list = map.get(m.provider) ?? [];
    list.push(m);
    map.set(m.provider, list);
  }
  const providers = [...map.keys()].sort((a, b) => a.localeCompare(b));
  return providers.map((p) => ({ provider: p, models: (map.get(p) ?? []).sort((a, b) => a.name.localeCompare(b.name)) }));
}

function CatalogSkeleton() {
  return (
    <div className="relative w-full min-w-0 max-w-6xl mx-auto px-4 py-10 pb-16 sm:px-6 space-y-14" aria-hidden>
      <header className="space-y-4">
        <Skeleton className="h-3 w-36 rounded" />
        <Skeleton className="h-10 w-full max-w-md rounded-lg sm:h-11" />
        <Skeleton className="h-14 w-full max-w-2xl rounded-lg" />
      </header>
      <Skeleton className="h-28 w-full rounded-2xl sm:h-32" />
      <div className="space-y-6 border-t border-border/40 pt-10">
        <div className="space-y-3 max-w-2xl">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-8 w-full max-w-sm rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full min-h-[10rem] rounded-xl" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-48 rounded-md" />
        <Skeleton className="h-36 w-full rounded-xl sm:h-40" />
      </div>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-56 rounded-md" />
            <Skeleton className="h-3 w-72 max-w-full rounded" />
          </div>
          <Skeleton className="h-8 w-full sm:w-56 rounded-lg shrink-0" />
        </div>
        <Skeleton className="h-52 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data, isPending, isError, error, refetch } = usePricingCatalog();
  const packsQuery = usePacks();
  const checkoutMutation = useCheckout();
  const [query, setQuery] = useState("");

  function handlePackAction(packId: string) {
    if (user) {
      checkoutMutation.mutate(packId);
      return;
    }
    navigate(`/register?${BILLING_PACK_QUERY_PARAM}=${encodeURIComponent(packId)}`);
  }

  const filteredImageModels = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.imageModels.filter((m) => {
      if (!q) return true;
      return m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
    });
  }, [data, query]);

  const grouped = useMemo(() => groupModelsByProvider(filteredImageModels), [filteredImageModels]);

  useEffect(() => {
    if (location.hash !== "#token-packs") return;
    if (isPending || isError) return;
    const run = () => {
      document.getElementById("token-packs")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, [location.pathname, location.hash, isPending, isError]);

  if (isPending) {
    return (
      <div className="relative flex w-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-surface">
        <CatalogSkeleton />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto overflow-x-hidden bg-surface px-6">
        <p className="text-sm text-slate-400 text-center max-w-sm">{error instanceof Error ? error.message : "Could not load pricing."}</p>
        <Button type="button" variant="secondary" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const { trippoModels } = data;
  const trippoGroups = groupTrippoModels(trippoModels);

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-surface">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-90"
        aria-hidden
        style={{
          background: "radial-gradient(ellipse 80% 60% at 15% -10%, rgba(124,58,237,0.22), transparent 55%), radial-gradient(ellipse 70% 50% at 85% 0%, rgba(14,165,233,0.08), transparent 50%), radial-gradient(ellipse 50% 40% at 50% 20%, rgba(167,139,250,0.06), transparent 60%)",
        }}
      />

      <div className="relative max-w-6xl mx-auto min-w-0 px-4 sm:px-6 py-10 pb-16 space-y-14">
        <header className="space-y-4">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500 font-medium">Wallet &amp; models</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-100 tracking-tight leading-tight">Pricing &amp; token rates</h1>
          <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">Every action debits wallet tokens. Top up with packs, then spend on image models, mesh/rig steps, and chat. Listed EUR figures are indicative provider cost; packs are charged in EUR at checkout.</p>
        </header>

        <section id="token-packs" className="relative -mx-4 scroll-mt-10 border-t border-border/60 bg-surface/20 px-4 py-12 sm:-mx-6 sm:px-6 sm:py-16" aria-labelledby="pricing-token-packs-heading">
          <div className="max-w-2xl">
            <p className={cn("font-mono text-xs font-medium uppercase tracking-widest text-accent-light/90")}>Pricing</p>
            <h2 id="pricing-token-packs-heading" className="mt-3 text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
              {LANDING_PACKS_TITLE}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">{LANDING_PACKS_SUBTITLE}</p>
            <p
              className={cn(
                "mt-4 inline-flex max-w-full items-center gap-2 rounded-lg border border-accent/35 bg-accent/10 px-3 py-2",
                "font-sans text-sm font-medium text-accent-light",
              )}
            >
              {LANDING_PACKS_SIGNUP_BONUS}
            </p>
          </div>
          <div className="mt-10">
            <TokenPacksGrid packs={packsQuery.data} isLoading={packsQuery.isLoading} onPackAction={handlePackAction} busyPackId={checkoutMutation.isPending ? (checkoutMutation.variables ?? null) : null} isActionLocked={checkoutMutation.isPending} primaryCtaLabel={user ? undefined : "Get started"} />
          </div>
        </section>

        <section className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Tripo 3D rates</h2>
            <p className="text-xs text-slate-500 mt-1">Provider credit costs with wallet markup applied. Live studio steps currently use H-series standard texture mesh, rig check, auto rig, and retarget.</p>
          </div>
          {trippoGroups.map((group) => (
            <div key={group.category} className="space-y-3">
              <h3 className="text-sm font-medium uppercase tracking-wider text-slate-500">{group.label}</h3>
              <div className="rounded-xl border border-border overflow-hidden -mx-1 min-w-0 sm:mx-0">
                <div className="overflow-x-auto overscroll-x-contain touch-pan-x">
                  <table className="w-full min-w-max text-sm">
                    <thead>
                      <tr className="bg-surface/80 text-left text-xs uppercase tracking-wider text-slate-500">
                        <th className="px-3 py-3 font-medium sm:px-4 min-w-36">Option</th>
                        <th className="px-3 py-3 font-medium text-right whitespace-nowrap sm:px-4">Tokens</th>
                        <th className="px-3 py-3 font-medium text-right whitespace-nowrap sm:px-4 hidden sm:table-cell">~EUR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {group.models.map((m) => (
                        <tr key={m.id} className="bg-panel/40 hover:bg-panel/70 transition-colors">
                          <td className="px-3 py-3 text-slate-200 break-words sm:px-4 max-w-xs sm:max-w-md">
                            <span>{trippoDisplayLabel(m)}</span>
                            {m.unit && m.unit !== "task" ? (
                              <span className="ml-2 text-[0.65rem] uppercase tracking-wider text-slate-500">/{m.unit.replace(/_/g, " ")}</span>
                            ) : null}
                          </td>
                          <td className="px-3 py-3 text-right font-mono tabular-nums text-accent-light whitespace-nowrap sm:px-4">{m.tokens}</td>
                          <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-500 text-xs whitespace-nowrap sm:px-4 hidden sm:table-cell">{usd(m.priceEur)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Image generation models</h2>
              <p className="text-xs text-slate-500 mt-1">Per-generation token debit. Filter by name or provider.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="w-full sm:w-56 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-surface text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-accent/50" />
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {grouped.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center border border-dashed border-border rounded-xl">No models match your filters.</p>
            ) : (
              grouped.map(({ provider, models }) => (
                <div key={provider}>
                  <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-3 border-b border-border pb-2">{provider}</h3>
                  <div className="rounded-xl border border-border overflow-hidden -mx-1 min-w-0 sm:mx-0">
                    <div className="overflow-x-auto overscroll-x-contain touch-pan-x">
                      <table className="w-full min-w-max text-sm">
                        <thead>
                          <tr className="bg-surface/80 text-left text-xs uppercase tracking-wider text-slate-500">
                            <th className="px-3 py-2.5 font-medium min-w-44 sm:min-w-56">Model</th>
                            <th className="px-3 py-2.5 font-medium whitespace-nowrap">Type</th>
                            <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">Tokens</th>
                            <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap hidden md:table-cell">~EUR</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {models.map((m) => (
                            <tr key={m.id} className="bg-panel/30 hover:bg-panel/60 transition-colors">
                              <td className="px-3 py-2.5 min-w-0 max-w-72 sm:max-w-md">
                                <p className="text-slate-200 text-xs leading-snug break-words">{m.name}</p>
                                <p className="text-[0.65rem] font-mono text-slate-600 break-all mt-0.5">{m.id}</p>
                              </td>
                              <td className="px-3 py-2.5 text-xs text-slate-500 align-top whitespace-nowrap">{m.imageToImage ? <span className="tag-cyan whitespace-nowrap">Image-to-image</span> : <span className="text-slate-600">Text-to-image</span>}</td>
                              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-accent-light text-xs whitespace-nowrap align-top">{m.tokens}</td>
                              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-500 text-xs whitespace-nowrap align-top hidden md:table-cell">{usd(m.priceEur)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
