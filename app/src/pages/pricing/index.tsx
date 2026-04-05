import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { usePricingCatalog } from "@/features/pricing/hooks/use-pricing.hooks";
import type { PricingImageModelDto } from "@/features/pricing/interfaces/pricing.interfaces";
import { cn } from "@/utils/cn";

const eur = (amount: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount);

const usd = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 3 }).format(amount);

function humanizeTrippoId(id: string) {
  return id.replace(/_/g, " ");
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
    <div className="space-y-10 px-4 py-8 max-w-6xl mx-auto" aria-hidden>
      <Skeleton className="h-14 w-2/3 max-w-md rounded-lg" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

export default function PricingPage() {
  const { data, isPending, isError, error, refetch } = usePricingCatalog();
  const [query, setQuery] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);

  const filteredImageModels = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.imageModels.filter((m) => {
      if (availableOnly && !m.available) return false;
      if (!q) return true;
      return m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
    });
  }, [data, query, availableOnly]);

  const grouped = useMemo(() => groupModelsByProvider(filteredImageModels), [filteredImageModels]);

  if (isPending) {
    return (
      <div className="h-full overflow-y-auto min-h-0 bg-surface">
        <CatalogSkeleton />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="h-full overflow-y-auto min-h-0 flex flex-col items-center justify-center gap-4 px-6 bg-surface">
        <p className="text-sm text-slate-400 text-center max-w-sm">{error instanceof Error ? error.message : "Could not load pricing."}</p>
        <Button type="button" variant="secondary" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const { rates, packs, trippoModels } = data;

  return (
    <div className="h-full overflow-y-auto min-h-0 bg-surface relative">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-90"
        aria-hidden
        style={{
          background: "radial-gradient(ellipse 80% 60% at 15% -10%, rgba(124,58,237,0.22), transparent 55%), radial-gradient(ellipse 70% 50% at 85% 0%, rgba(14,165,233,0.08), transparent 50%), radial-gradient(ellipse 50% 40% at 50% 20%, rgba(167,139,250,0.06), transparent 60%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        aria-hidden
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 pb-16 space-y-14">
        <header className="space-y-4">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500 font-medium">Wallet &amp; models</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-100 tracking-tight leading-tight" style={{ fontFamily: "Syne, system-ui, sans-serif" }}>
            Pricing &amp; token rates
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">Every action debits wallet tokens. Top up with packs, then spend on image models, mesh/rig steps, and chat. Listed EUR figures are indicative provider cost; packs are charged in EUR at checkout.</p>
        </header>

        <section className="rounded-2xl border border-border/80 bg-panel/80 backdrop-blur-sm px-5 py-6 sm:px-7 sm:py-7 shadow-[0_0_0_1px_rgba(124,58,237,0.06)]" style={{ animation: "msgIn 0.45s ease-out both" }}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">How tokens work</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-2xl font-mono font-semibold tabular-nums text-accent-light">{rates.tokensPerUsd}</p>
              <p className="text-xs text-slate-500">tokens per 1 EUR (reference rate)</p>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-100" style={{ fontFamily: "Syne, system-ui, sans-serif" }}>
                Token packs
              </h2>
              <p className="text-xs text-slate-500 mt-1">Same packs as billing — pay in EUR via Stripe.</p>
            </div>
            <Link to="/settings/billing" className={cn("inline-flex items-center justify-center rounded font-medium transition-colors", "bg-panel border border-border text-slate-300 hover:bg-white/5 text-xs px-2.5 py-1 h-9")}>
              Buy tokens
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {packs.map((pack, i) => (
              <article key={pack.id} className={cn("rounded-xl border bg-panel/90 px-5 py-5 flex flex-col gap-2 transition-colors hover:border-accent/30", pack.id === "creator" ? "border-accent/35 shadow-[0_0_24px_-8px_rgba(124,58,237,0.35)]" : "border-border")} style={{ animation: `msgIn 0.4s ease-out ${0.06 * i}s both` }}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-slate-100">{pack.name}</h3>
                  {pack.id === "creator" && <span className="text-[0.65rem] uppercase tracking-wider tag-violet px-2 py-0.5 rounded">Popular</span>}
                </div>
                <p className="text-2xl font-mono font-semibold tabular-nums text-slate-200 mt-1">{eur(pack.price)}</p>
                <p className="text-sm text-slate-500">
                  <span className="font-mono tabular-nums text-accent-light/90">{pack.tokens}</span> tokens
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-100" style={{ fontFamily: "Syne, system-ui, sans-serif" }}>
            Tripo / mesh steps
          </h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface/80 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-medium">Step</th>
                  <th className="px-4 py-3 font-medium text-right w-28">Tokens</th>
                  <th className="px-4 py-3 font-medium text-right w-32 hidden sm:table-cell">~EUR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trippoModels.map((m) => (
                  <tr key={m.id} className="bg-panel/40 hover:bg-panel/70 transition-colors">
                    <td className="px-4 py-3 text-slate-200 capitalize">{humanizeTrippoId(m.id)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-accent-light">{m.tokens}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-500 text-xs hidden sm:table-cell">{usd(m.priceUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-100" style={{ fontFamily: "Syne, system-ui, sans-serif" }}>
                Image generation models
              </h2>
              <p className="text-xs text-slate-500 mt-1">Per-generation token debit. Filter by name or provider.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} className="rounded border-border bg-surface text-accent focus:ring-accent/40" />
                Available only
              </label>
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
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface/80 text-left text-xs uppercase tracking-wider text-slate-500">
                          <th className="px-3 py-2.5 font-medium">Model</th>
                          <th className="px-3 py-2.5 font-medium w-24">Type</th>
                          <th className="px-3 py-2.5 font-medium text-right w-24">Tokens</th>
                          <th className="px-3 py-2.5 font-medium text-right w-28 hidden md:table-cell">~EUR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {models.map((m) => (
                          <tr key={m.id} className="bg-panel/30 hover:bg-panel/60 transition-colors">
                            <td className="px-3 py-2.5">
                              <p className="text-slate-200 text-xs leading-snug">{m.name}</p>
                              <p className="text-[0.65rem] font-mono text-slate-600 truncate max-w-[14rem] sm:max-w-xs">{m.id}</p>
                            </td>
                            <td className="px-3 py-2.5 text-xs text-slate-500">{m.imageToImage ? <span className="tag-cyan whitespace-nowrap">Image-to-image</span> : <span className="text-slate-600">Text-to-image</span>}</td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums text-accent-light text-xs">{m.tokens}</td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-500 text-xs hidden md:table-cell">{usd(m.priceUsd)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
