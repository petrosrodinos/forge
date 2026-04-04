import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Coins, ImagePlus } from "lucide-react";
import { cn } from "@/utils/cn";
import { Spinner } from "@/components/ui/Spinner";
import { useImageModels } from "@/features/image-models/hooks/use-image-models.hooks";
import { groupImageModelsByProvider } from "@/features/image-models/utils/group-image-models";
import { FALLBACK_IMAGE_MODEL_ID } from "@/utils/constants";

function formatTokens(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString();
}

interface ImageModelSelectProps {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  id?: string;
}

export function ImageModelSelect({
  value,
  onChange,
  disabled,
  className,
  buttonClassName,
  id,
}: ImageModelSelectProps) {
  const { data: models = [], isLoading, isError } = useImageModels();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => groupImageModelsByProvider(models), [models]);
  const selected = useMemo(() => models.find((m) => m.id === value), [models, value]);

  const syncValue = useCallback(() => {
    if (!models.length) return;
    if (!models.some((m) => m.id === value)) {
      onChange(models[0].id);
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

  const showFallback = isError || (!isLoading && models.length === 0);
  const busy = isLoading && models.length === 0;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled || busy}
        onClick={() => !busy && setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center gap-2 bg-panel border border-border rounded px-2 py-1.5 text-xs text-slate-200",
          "focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors",
          (disabled || busy) && "opacity-60 cursor-not-allowed",
          buttonClassName,
        )}
      >
        {busy ? (
          <span className="flex items-center gap-2 text-slate-400">
            <Spinner className="w-3 h-3" />
            Loading models…
          </span>
        ) : showFallback ? (
          <span className="text-amber-400/90 truncate text-left flex-1">
            Using fallback model — open list to choose
          </span>
        ) : (
          <>
            <span className="flex items-center gap-1.5 min-w-0 flex-1 text-left">
              {selected?.isImageToImage ? (
                <span title="Image-to-image model" className="inline-flex shrink-0">
                  <ImagePlus className="w-3.5 h-3.5 text-sky-400/90" strokeWidth={2} aria-hidden />
                </span>
              ) : null}
              <span className="truncate">{selected?.label ?? value}</span>
            </span>
            {selected != null && (
              <span
                className="inline-flex items-center gap-0.5 shrink-0 text-amber-400/90 font-mono tabular-nums"
                title="Token cost per generation"
              >
                <Coins className="w-3.5 h-3.5 opacity-90" strokeWidth={2} aria-hidden />
                <span>{formatTokens(selected.tokens)}</span>
              </span>
            )}
            <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 text-slate-500 transition-transform", open && "rotate-180")} />
          </>
        )}
      </button>

      {open && !busy && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-border bg-panel shadow-lg py-1"
        >
          {showFallback ? (
            <button
              type="button"
              role="option"
              aria-selected={value === FALLBACK_IMAGE_MODEL_ID}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left text-xs hover:bg-surface transition-colors",
                value === FALLBACK_IMAGE_MODEL_ID && "bg-accent/15",
              )}
              onClick={() => {
                onChange(FALLBACK_IMAGE_MODEL_ID);
                setOpen(false);
              }}
            >
              <span className="truncate text-slate-200">Default ({FALLBACK_IMAGE_MODEL_ID})</span>
            </button>
          ) : (
            groups.map(([provider, items]) => (
              <div key={provider} className="py-0.5">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sticky top-0 bg-panel">
                  {provider}
                </div>
                {items.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="option"
                    aria-selected={m.id === value}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left text-xs hover:bg-surface transition-colors",
                      m.id === value && "bg-accent/15 text-slate-100",
                    )}
                    onClick={() => {
                      onChange(m.id);
                      setOpen(false);
                    }}
                  >
                    <span className="flex items-center gap-1.5 min-w-0 flex-1 pr-2">
                      {m.isImageToImage ? (
                        <span title="Image-to-image" className="inline-flex shrink-0">
                          <ImagePlus className="w-3.5 h-3.5 text-sky-400/90" strokeWidth={2} aria-hidden />
                        </span>
                      ) : (
                        <span className="w-3.5 shrink-0" aria-hidden />
                      )}
                      <span className="truncate text-slate-200">{m.label}</span>
                    </span>
                    <span className="inline-flex items-center gap-0.5 shrink-0 text-amber-400/85 font-mono tabular-nums text-[11px]">
                      <Coins className="w-3 h-3 opacity-90" strokeWidth={2} aria-hidden />
                      {formatTokens(m.tokens)}
                    </span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
