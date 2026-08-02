import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Coins } from "lucide-react";
import { cn } from "@/utils/cn";
import { Spinner } from "@/components/ui/Spinner";
import { usePricingCatalog } from "@/features/pricing/hooks/use-pricing.hooks";
import type { PricingMeshModelDto } from "@/features/pricing/interfaces/pricing.interfaces";
import type {
  MeshGenerationOptions,
  MeshGeometryQuality,
  MeshTextureQuality,
  TrippoMeshModelVersion,
} from "@/features/models3d/interfaces/mesh-options.interfaces";
import { meshTokenCost } from "@/features/models3d/utils/mesh-token-cost";

function formatTokens(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString();
}

interface TripoMeshModelSelectProps {
  value: MeshGenerationOptions;
  onChange: (next: MeshGenerationOptions) => void;
  mode?: "image" | "multiview";
  disabled?: boolean;
  className?: string;
}

export function TripoMeshModelSelect({
  value,
  onChange,
  mode = "image",
  disabled,
  className,
}: TripoMeshModelSelectProps) {
  const { data, isLoading, isError } = usePricingCatalog();
  const models = data?.meshModels ?? [];
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => models.find((m) => m.id === value.model),
    [models, value.model],
  );

  const syncValue = useCallback(() => {
    if (!models.length) return;
    if (!models.some((m) => m.id === value.model)) {
      onChange({ ...value, model: models[0].id as TrippoMeshModelVersion });
    }
  }, [models, value, onChange]);

  useEffect(() => {
    syncValue();
  }, [syncValue]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const tokenCost = meshTokenCost(selected, value, mode);
  const busy = isLoading && models.length === 0;

  function pickModel(m: PricingMeshModelDto) {
    const next: MeshGenerationOptions = {
      ...value,
      model: m.id as TrippoMeshModelVersion,
      geometryQuality: m.supportsGeometryQuality ? value.geometryQuality : "standard",
      textureQuality:
        !m.supportsTextureExtreme && value.textureQuality === "extreme"
          ? "detailed"
          : value.textureQuality,
    };
    onChange(next);
    setOpen(false);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled || busy}
          onClick={() => !busy && setOpen((o) => !o)}
          className={cn(
            "w-full flex items-center gap-2 bg-panel border border-border rounded px-2 py-1.5 text-xs text-slate-200",
            "focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors",
            (disabled || busy) && "opacity-60 cursor-not-allowed",
          )}
        >
          {busy ? (
            <span className="flex items-center gap-2 text-slate-400">
              <Spinner className="w-3 h-3" />
              Loading mesh models…
            </span>
          ) : isError || models.length === 0 ? (
            <span className="truncate text-left flex-1 text-amber-400/90">Mesh models unavailable</span>
          ) : (
            <>
              <span className="truncate flex-1 text-left">{selected?.label ?? value.model}</span>
              {tokenCost != null ? (
                <span className="inline-flex items-center gap-0.5 shrink-0 text-amber-400/90 font-mono tabular-nums">
                  <Coins className="w-3.5 h-3.5 opacity-90" strokeWidth={2} aria-hidden />
                  <span>{formatTokens(tokenCost)}</span>
                </span>
              ) : null}
              <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 text-slate-500 transition-transform", open && "rotate-180")} />
            </>
          )}
        </button>

        {open && !busy && models.length > 0 ? (
          <div
            role="listbox"
            className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-border bg-panel shadow-lg py-1"
          >
            {(["h", "p"] as const).map((series) => {
              const items = models.filter((m) => m.series === series);
              if (!items.length) return null;
              return (
                <div key={series} className="py-0.5">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sticky top-0 bg-panel">
                    {series === "h" ? "H Series" : "P Series"}
                  </div>
                  {items.map((m) => {
                    const cost = meshTokenCost(m, { ...value, model: m.id as TrippoMeshModelVersion }, mode);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        role="option"
                        aria-selected={m.id === value.model}
                        className={cn(
                          "w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left text-xs hover:bg-surface transition-colors",
                          m.id === value.model && "bg-accent/15 text-slate-100",
                        )}
                        onClick={() => pickModel(m)}
                      >
                        <span className="truncate text-slate-200 pr-2">{m.label}</span>
                        {cost != null ? (
                          <span className="inline-flex items-center gap-0.5 shrink-0 text-amber-400/85 font-mono tabular-nums text-[11px]">
                            <Coins className="w-3 h-3 opacity-90" strokeWidth={2} aria-hidden />
                            {formatTokens(cost)}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="flex min-w-[8rem] flex-1 flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-slate-500">Texture</span>
          <select
            className="rounded border border-border bg-panel px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-accent/50"
            disabled={disabled}
            value={value.textureQuality}
            onChange={(e) =>
              onChange({ ...value, textureQuality: e.target.value as MeshTextureQuality })
            }
          >
            <option value="standard">Standard</option>
            <option value="detailed">Detailed</option>
            {selected?.supportsTextureExtreme ? <option value="extreme">Extreme (8K)</option> : null}
          </select>
        </label>
        {selected?.supportsGeometryQuality ? (
          <label className="flex min-w-[8rem] flex-1 flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">Geometry</span>
            <select
              className="rounded border border-border bg-panel px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-accent/50"
              disabled={disabled}
              value={value.geometryQuality}
              onChange={(e) =>
                onChange({ ...value, geometryQuality: e.target.value as MeshGeometryQuality })
              }
            >
              <option value="standard">Standard</option>
              <option value="detailed">Ultra</option>
            </select>
          </label>
        ) : null}
      </div>
    </div>
  );
}
