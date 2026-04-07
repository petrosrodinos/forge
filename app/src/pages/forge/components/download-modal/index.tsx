import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Download,
  Image as ImageIcon,
  Box,
  Loader2,
  X,
  Sparkles,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";
import { useFigures } from "@/features/figures/hooks/use-figures.hooks";
import { useDownloadZip } from "@/features/download/hooks/use-download.hooks";
import type {
  DownloadFigureSelection,
  DownloadImageItem,
  DownloadModelItem,
  DownloadSkinSelection,
  DownloadVariantSelection,
  DownloadZipRequest,
} from "@/features/download/interfaces/download.interfaces";
import type { Figure, Skin, SkinImage, SkinVariant } from "@/interfaces";

interface DownloadModalProps {
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Indeterminate checkbox
// ---------------------------------------------------------------------------

interface IndeterminateCheckboxProps {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  className?: string;
}

function IndeterminateCheckbox({ checked, indeterminate, onChange, className }: IndeterminateCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className={cn(
        "h-3.5 w-3.5 shrink-0 cursor-pointer rounded accent-accent",
        className,
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Asset key helpers
// ---------------------------------------------------------------------------

function imgKey(id: string) { return `img:${id}`; }
function modelKey(id: string) { return `model:${id}`; }
function animKey(id: string) { return `anim:${id}`; }

function getImageKeys(img: SkinImage): string[] {
  const keys: string[] = [];
  const url = img.gcsUrl ?? img.sourceUrl;
  if (url) keys.push(imgKey(img.id));
  for (const m of img.models) {
    if (m.gcsPbrModelUrl) keys.push(modelKey(m.id));
    for (const a of m.animations) {
      if (a.gcsGlbUrl) keys.push(animKey(a.id));
    }
  }
  return keys;
}

function getVariantKeys(variant: SkinVariant): string[] {
  return variant.images.flatMap(getImageKeys);
}

function getSkinKeys(skin: Skin): string[] {
  return skin.variants.flatMap(getVariantKeys);
}

function getFigureKeys(figure: Figure): string[] {
  return figure.skins.flatMap(getSkinKeys);
}

function selectionState(keys: string[], selected: Set<string>): "all" | "some" | "none" {
  if (keys.length === 0) return "none";
  const count = keys.filter((k) => selected.has(k)).length;
  if (count === 0) return "none";
  if (count === keys.length) return "all";
  return "some";
}

// ---------------------------------------------------------------------------
// Build ZIP request from selected keys
// ---------------------------------------------------------------------------

function buildRequest(figures: Figure[], selected: Set<string>): DownloadZipRequest {
  const selections: DownloadFigureSelection[] = [];

  for (const figure of figures) {
    const skinSelections: DownloadSkinSelection[] = [];

    for (const skin of figure.skins) {
      const variantSelections: DownloadVariantSelection[] = [];

      for (const variant of skin.variants) {
        const images: DownloadImageItem[] = [];
        const models: DownloadModelItem[] = [];

        for (const img of variant.images) {
          const url = img.gcsUrl ?? img.sourceUrl;
          if (url && selected.has(imgKey(img.id))) {
            const ext = url.split("?")[0]?.split(".").pop() ?? "png";
            images.push({ imageId: img.id, url, filename: `image-${img.id.slice(0, 8)}.${ext}` });
          }
          for (const m of img.models) {
            if (m.gcsPbrModelUrl && selected.has(modelKey(m.id))) {
              models.push({ modelId: m.id, url: m.gcsPbrModelUrl, filename: `mesh-${m.id.slice(0, 8)}.glb` });
            }
            for (const a of m.animations) {
              if (a.gcsGlbUrl && selected.has(animKey(a.id))) {
                const animName = a.animationKey.replace(/[^a-z0-9_-]/gi, "-");
                models.push({ modelId: a.id, url: a.gcsGlbUrl, filename: `anim-${animName}-${a.id.slice(0, 8)}.glb` });
              }
            }
          }
        }

        if (images.length > 0 || models.length > 0) {
          variantSelections.push({ variantId: variant.id, variantLetter: variant.variant, images, models });
        }
      }

      if (variantSelections.length > 0) {
        skinSelections.push({ skinId: skin.id, skinName: skin.name ?? "base", variants: variantSelections });
      }
    }

    if (skinSelections.length > 0) {
      selections.push({ figureId: figure.id, figureName: figure.name, skins: skinSelections });
    }
  }

  return { selections };
}

// ---------------------------------------------------------------------------
// Tree row helpers
// ---------------------------------------------------------------------------

interface RowProps {
  depth: number;
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  checked: boolean;
  indeterminate: boolean;
  onToggle: () => void;
  expandable?: boolean;
  expanded?: boolean;
  onExpand?: () => void;
  disabled?: boolean;
}

function TreeRow({ depth, icon, label, sublabel, checked, indeterminate, onToggle, expandable, expanded, onExpand, disabled }: RowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
        "hover:bg-surface/60",
        disabled && "opacity-40 pointer-events-none",
      )}
      style={{ paddingLeft: `${(depth * 16) + 8}px` }}
    >
      {expandable ? (
        <button
          type="button"
          onClick={onExpand}
          className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          <ChevronRight size={12} className={cn("transition-transform duration-150", expanded && "rotate-90")} />
        </button>
      ) : (
        <span className="w-3 shrink-0" />
      )}
      <IndeterminateCheckbox checked={checked} indeterminate={indeterminate} onChange={onToggle} />
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs text-slate-200">{label}</span>
        {sublabel && <span className="block truncate text-[10px] text-slate-500">{sublabel}</span>}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

export function DownloadModal({ onClose }: DownloadModalProps) {
  const { data: figures = [], isLoading } = useFigures();
  const { download, downloading, error } = useDownloadZip();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  // Initialise: expand all figures, select all assets
  useEffect(() => {
    if (figures.length === 0) return;
    const allKeys = figures.flatMap(getFigureKeys);
    setSelected(new Set(allKeys));
    setExpanded(new Set(figures.map((f) => `fig:${f.id}`)));
  }, [figures]);

  function toggle(keys: string[]) {
    setSelected((prev) => {
      const next = new Set(prev);
      const allIn = keys.every((k) => next.has(k));
      if (allIn) keys.forEach((k) => next.delete(k));
      else keys.forEach((k) => next.add(k));
      return next;
    });
  }

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(figures.flatMap(getFigureKeys)));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  const selectedCount = selected.size;

  const request = useMemo(() => buildRequest(figures, selected), [figures, selected]);
  const hasSelection = request.selections.length > 0;

  async function handleDownload() {
    if (!hasSelection) return;
    await download(request);
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-panel shadow-2xl shadow-black/50 ring-1 ring-white/5" style={{ maxHeight: "80vh" }}>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/80 bg-surface/40 px-5 py-4">
          <div>
            <p className="text-sm font-semibold tracking-tight text-slate-100">Download Assets</p>
            <p className="mt-0.5 text-xs text-slate-500">Select figures, skins, variants and 3D models to include in the ZIP.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-surface hover:text-slate-200"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/60 bg-panel/60 px-4 py-2">
          <span className="text-xs text-slate-500">
            {selectedCount === 0 ? "Nothing selected" : `${selectedCount} asset${selectedCount === 1 ? "" : "s"} selected`}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={selectAll} className="rounded px-2 py-0.5 text-[10px] text-slate-400 transition-colors hover:bg-surface hover:text-slate-200">
              All
            </button>
            <span className="text-slate-700">·</span>
            <button type="button" onClick={deselectAll} className="rounded px-2 py-0.5 text-[10px] text-slate-400 transition-colors hover:bg-surface hover:text-slate-200">
              None
            </button>
          </div>
        </div>

        {/* Tree */}
        <div className="min-h-0 flex-1 overflow-y-auto py-2 px-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-slate-500" />
            </div>
          ) : figures.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-500">No figures found.</p>
          ) : (
            figures.map((figure) => {
              const figKeys = getFigureKeys(figure);
              const figState = selectionState(figKeys, selected);
              const figExpanded = expanded.has(`fig:${figure.id}`);

              return (
                <div key={figure.id}>
                  <TreeRow
                    depth={0}
                    icon={<Box size={13} />}
                    label={figure.name}
                    sublabel={figure.type}
                    checked={figState === "all"}
                    indeterminate={figState === "some"}
                    onToggle={() => toggle(figKeys)}
                    expandable
                    expanded={figExpanded}
                    onExpand={() => toggleExpand(`fig:${figure.id}`)}
                    disabled={figKeys.length === 0}
                  />

                  {figExpanded && figure.skins.map((skin) => {
                    const skinKeys = getSkinKeys(skin);
                    const skinState = selectionState(skinKeys, selected);
                    const skinExpanded = expanded.has(`skin:${skin.id}`);
                    const skinLabel = skin.name ?? "Base";

                    return (
                      <div key={skin.id}>
                        <TreeRow
                          depth={1}
                          icon={<Layers size={12} />}
                          label={skinLabel}
                          sublabel={skin.isBase ? "Base skin" : "Skin"}
                          checked={skinState === "all"}
                          indeterminate={skinState === "some"}
                          onToggle={() => toggle(skinKeys)}
                          expandable
                          expanded={skinExpanded}
                          onExpand={() => toggleExpand(`skin:${skin.id}`)}
                          disabled={skinKeys.length === 0}
                        />

                        {skinExpanded && skin.variants.map((variant) => {
                          const variantKeys = getVariantKeys(variant);
                          const variantState = selectionState(variantKeys, selected);
                          const variantExpanded = expanded.has(`variant:${variant.id}`);

                          return (
                            <div key={variant.id}>
                              <TreeRow
                                depth={2}
                                icon={<span className="text-[10px] font-bold text-slate-400">{variant.variant}</span>}
                                label={`Variant ${variant.variant}`}
                                sublabel={`${variant.images.length} image${variant.images.length === 1 ? "" : "s"}`}
                                checked={variantState === "all"}
                                indeterminate={variantState === "some"}
                                onToggle={() => toggle(variantKeys)}
                                expandable
                                expanded={variantExpanded}
                                onExpand={() => toggleExpand(`variant:${variant.id}`)}
                                disabled={variantKeys.length === 0}
                              />

                              {variantExpanded && variant.images.map((img) => {
                                const imgKeys = getImageKeys(img);
                                const imgState = selectionState(imgKeys, selected);
                                const imgUrl = img.gcsUrl ?? img.sourceUrl;
                                const imgExpanded = expanded.has(`img:${img.id}`);
                                const hasModels = img.models.length > 0;

                                return (
                                  <div key={img.id}>
                                    <TreeRow
                                      depth={3}
                                      icon={<ImageIcon size={11} />}
                                      label="Image"
                                      sublabel={img.id.slice(0, 12)}
                                      checked={imgState === "all"}
                                      indeterminate={imgState === "some"}
                                      onToggle={() => toggle(imgKeys)}
                                      expandable={!!imgUrl || img.models.length > 0}
                                      expanded={imgExpanded}
                                      onExpand={() => toggleExpand(`img:${img.id}`)}
                                      disabled={imgKeys.length === 0}
                                    />

                                    {imgExpanded && (
                                      <>
                                        {/* Reference image file */}
                                        {imgUrl && (
                                          <TreeRow
                                            depth={4}
                                            icon={<ImageIcon size={10} className="text-sky-400/70" />}
                                            label="Reference image"
                                            sublabel=".png / .jpg"
                                            checked={selected.has(imgKey(img.id))}
                                            indeterminate={false}
                                            onToggle={() => toggle([imgKey(img.id)])}
                                          />
                                        )}

                                        {/* 3D models grouped under this image */}
                                        {img.models.map((model) => {
                                          const animKeys = model.animations.filter((a) => a.gcsGlbUrl).map((a) => animKey(a.id));
                                          const modelKeys = [
                                            ...(model.gcsPbrModelUrl ? [modelKey(model.id)] : []),
                                            ...animKeys,
                                          ];
                                          const modelState = selectionState(modelKeys, selected);
                                          const modelExpanded = expanded.has(`model:${model.id}`);
                                          const modelExpandable = !!model.gcsPbrModelUrl || animKeys.length > 0;

                                          return (
                                            <div key={model.id}>
                                              <TreeRow
                                                depth={4}
                                                icon={<Box size={11} className="text-violet-400/80" />}
                                                label="3D Model"
                                                sublabel={model.status}
                                                checked={modelState === "all"}
                                                indeterminate={modelState === "some"}
                                                onToggle={() => toggle(modelKeys)}
                                                expandable={modelExpandable}
                                                expanded={modelExpanded}
                                                onExpand={() => toggleExpand(`model:${model.id}`)}
                                                disabled={modelKeys.length === 0}
                                              />

                                              {/* Mesh + animations — only when model row is expanded */}
                                              {modelExpanded && (
                                                <>
                                                  {model.gcsPbrModelUrl && (
                                                    <TreeRow
                                                      depth={5}
                                                      icon={<Box size={10} className="text-violet-400/60" />}
                                                      label="Mesh"
                                                      sublabel=".glb"
                                                      checked={selected.has(modelKey(model.id))}
                                                      indeterminate={false}
                                                      onToggle={() => toggle([modelKey(model.id)])}
                                                    />
                                                  )}

                                                  {model.animations.map((anim) => (
                                                    anim.gcsGlbUrl ? (
                                                      <TreeRow
                                                        key={anim.id}
                                                        depth={5}
                                                        icon={<Sparkles size={10} className="text-amber-400/70" />}
                                                        label={anim.animationKey}
                                                        sublabel=".glb"
                                                        checked={selected.has(animKey(anim.id))}
                                                        indeterminate={false}
                                                        onToggle={() => toggle([animKey(anim.id)])}
                                                      />
                                                    ) : null
                                                  ))}
                                                </>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-border/80 bg-surface/40 px-5 py-3">
          {error ? (
            <p className="text-xs text-red-400 truncate max-w-[60%]">{error}</p>
          ) : (
            <p className="text-xs text-slate-500">
              {hasSelection ? `${request.selections.length} figure${request.selections.length === 1 ? "" : "s"} in export` : "Select at least one asset"}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!hasSelection || downloading}
              onClick={() => void handleDownload()}
              className="gap-1.5"
            >
              {downloading ? (
                <Loader2 size={13} className="animate-spin" aria-hidden />
              ) : (
                <Download size={13} aria-hidden />
              )}
              {downloading ? "Preparing…" : "Download ZIP"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
