import { useState, useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
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
      <div className="flex flex-col h-full items-center justify-center gap-3 text-slate-500">
        <p className="text-sm">No variants yet</p>
        <button
          onClick={handleAddVariant}
          disabled={createVariant.isPending}
          className="text-xs px-3 py-1.5 bg-accent/20 border border-accent/40 text-accent-light rounded hover:bg-accent/30 transition-colors disabled:opacity-50"
        >
          + Add Variant
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex items-center gap-1 px-3 border-b border-border bg-surface shrink-0 overflow-x-auto">
          {skin.variants.map((v) => (
            <div
              key={v.id}
              className={cn(
                "flex items-center gap-1 border-b-2 transition-colors",
                activeVariant?.id === v.id
                  ? "border-accent text-slate-100"
                  : "border-transparent text-slate-400 hover:text-slate-200",
              )}
            >
              <button
                onClick={() => setActiveVariantId(v.id)}
                className="text-xs px-2 py-1.5 whitespace-nowrap"
              >
                {v.name ?? v.variant}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setPendingDelete(v); }}
                className="text-slate-600 hover:text-red-400 transition-colors pr-1"
                title="Delete variant"
              >
                <X size={10} />
              </button>
            </div>
          ))}
          <button
            onClick={handleAddVariant}
            disabled={createVariant.isPending}
            className="text-xs px-2 py-1.5 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
          >
            <Plus size={13} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
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
