import { useState, useEffect, useRef } from "react";
import { LayoutGrid, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { VariantPanel } from "@/pages/forge/components/skin-panel/variant-panel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/utils/cn";
import { useCreateVariant, useDeleteVariant } from "@/features/skin-variants/hooks/use-skin-variants.hooks";
import type { Skin, SkinVariant } from "@/interfaces";

interface SkinPanelProps {
  skin: Skin;
  figureId: string;
  figureType: string;
  figureName: string;
}

export function SkinPanel({ skin, figureId, figureType, figureName }: SkinPanelProps) {
  const [activeVariantId, setActiveVariantId] = useState<string | null>(
    skin.variants[0]?.id ?? null,
  );
  const [pendingDelete, setPendingDelete] = useState<SkinVariant | null>(null);
  const autoAddedForSkin = useRef<string | null>(null);

  const createVariant = useCreateVariant();
  const deleteVariant = useDeleteVariant();

  useEffect(() => {
    if (skin.variants.length === 0 && autoAddedForSkin.current !== skin.id) {
      autoAddedForSkin.current = skin.id;
      createVariant.mutate(
        { figureId, skinId: skin.id },
        { onSuccess: (created) => setActiveVariantId(created.id) },
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skin.id]);

  const activeVariant =
    skin.variants.find((v) => v.id === activeVariantId) ?? skin.variants[0] ?? null;

  function handleAddVariant() {
    createVariant.mutate(
      { figureId, skinId: skin.id },
      { onSuccess: (created) => setActiveVariantId(created.id) },
    );
  }

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    const next = skin.variants.find((v) => v.id !== pendingDelete.id);
    deleteVariant.mutate(
      { figureId, skinId: skin.id, variantId: pendingDelete.id },
      { onSuccess: () => { if (activeVariantId === pendingDelete.id) setActiveVariantId(next?.id ?? null); } },
    );
    setPendingDelete(null);
  }

  if (skin.variants.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/12 text-accent-light ring-1 ring-accent/20">
          <LayoutGrid className="h-6 w-6" strokeWidth={1.5} aria-hidden />
        </div>
        <div className="max-w-xs space-y-2">
          <p className="text-sm font-medium text-slate-200">No variants yet</p>
          <p className="text-sm text-slate-500 leading-relaxed">Variants hold prompts and image sets — add one to start generating.</p>
        </div>
        <Button type="button" size="sm" onClick={handleAddVariant} disabled={createVariant.isPending}>
          <Plus size={16} strokeWidth={2} aria-hidden />
          Add variant
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex shrink-0 items-stretch border-b border-border bg-surface/30">
          <div className="flex min-w-0 flex-1 items-end gap-0 overflow-x-auto">
            {skin.variants.map((v) => (
              <div key={v.id} className="group/var flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => setActiveVariantId(v.id)}
                  className={cn(
                    "-mb-px border-b-2 px-2.5 py-2 text-xs whitespace-nowrap transition-colors",
                    activeVariant?.id === v.id
                      ? "border-accent-light/90 text-slate-100"
                      : "border-transparent text-slate-500 hover:text-slate-300",
                  )}
                >
                  {v.name ?? v.variant}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDelete(v);
                  }}
                  className="mb-px p-0.5 text-slate-600 opacity-40 transition-opacity hover:text-red-400 hover:opacity-100 sm:opacity-0 sm:group-hover/var:opacity-100"
                  title="Delete variant"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddVariant}
            disabled={createVariant.isPending}
            className="shrink-0 px-2 py-2 text-slate-500 hover:text-slate-300 disabled:opacity-40"
            title="Add variant"
            aria-label="Add variant"
          >
            <Plus size={14} strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {activeVariant ? (
            <VariantPanel
              variant={activeVariant}
              figureId={figureId}
              figureType={figureType}
              figureName={figureName}
              skinName={skin.name}
            />
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete variant "${pendingDelete?.name ?? pendingDelete?.variant}"?`}
        description="All images and models under this variant will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
        danger
      />
    </>
  );
}
