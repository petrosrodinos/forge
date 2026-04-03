import { useState } from "react";
import { Plus, X, Pencil } from "lucide-react";
import { useForgeStore } from "@/store/forgeStore";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useUpdateSkin } from "@/features/skins/hooks/use-skins.hooks";
import type { Skin } from "@/interfaces";

interface SkinTabsProps {
  skins: Skin[];
  figureId: string;
  onAddSkin: () => void;
  onDeleteSkin: (skin: Skin) => void;
}

export function SkinTabs({ skins, figureId, onAddSkin, onDeleteSkin }: SkinTabsProps) {
  const { activeSkin, setActiveSkin } = useForgeStore();
  const [pendingDelete, setPendingDelete] = useState<Skin | null>(null);
  const [editingSkin, setEditingSkin] = useState<Skin | null>(null);
  const [editName, setEditName] = useState("");

  const updateSkin = useUpdateSkin();

  function openEdit(e: React.MouseEvent, skin: Skin) {
    e.stopPropagation();
    setEditingSkin(skin);
    setEditName(skin.name ?? "");
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSkin || !editName.trim()) return;
    updateSkin.mutate(
      { figureId, skinId: editingSkin.id, name: editName.trim() },
      { onSuccess: () => setEditingSkin(null) },
    );
  }

  function handleConfirmDelete() {
    if (pendingDelete) {
      onDeleteSkin(pendingDelete);
      setPendingDelete(null);
    }
  }

  return (
    <>
      <div className="flex items-center gap-0.5 px-3 border-b-2 border-border bg-panel shrink-0 overflow-x-auto">
        {skins.map((skin) => (
          <div
            key={skin.id}
            className={cn(
              "group/tab flex items-center gap-0.5 border-b-2 -mb-0.5 transition-colors",
              activeSkin?.id === skin.id
                ? "border-accent text-slate-100"
                : "border-transparent text-slate-400 hover:text-slate-200",
            )}
          >
            <button
              onClick={() => setActiveSkin(skin)}
              className="text-sm font-medium px-3 py-3 whitespace-nowrap"
            >
              {skin.name ?? "Skin"}
            </button>
            <div className="flex items-center gap-0.5 pr-1.5 opacity-0 group-hover/tab:opacity-100 transition-opacity">
              <button
                onClick={(e) => openEdit(e, skin)}
                className="text-slate-500 hover:text-slate-200 transition-colors p-0.5 rounded"
                title="Rename skin"
              >
                <Pencil size={11} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setPendingDelete(skin); }}
                className="text-slate-500 hover:text-red-400 transition-colors p-0.5 rounded"
                title="Delete skin"
              >
                <X size={11} />
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={onAddSkin}
          className="px-2 py-3 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <Plus size={15} />
        </button>
      </div>

      {editingSkin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditingSkin(null)} />
          <form
            onSubmit={handleEditSubmit}
            className="relative z-10 bg-panel border border-border rounded-lg p-5 w-72 flex flex-col gap-4 shadow-xl"
          >
            <p className="text-sm font-semibold text-slate-100">Rename Skin</p>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Name</label>
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Skin name…"
                className="w-full bg-surface border border-border rounded px-3 py-2.5 text-base text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent/50"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditingSkin(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={updateSkin.isPending || !editName.trim()}>
                {updateSkin.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete skin "${pendingDelete?.name ?? "Skin"}"?`}
        description="All variants, images, and models under this skin will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
        danger
      />
    </>
  );
}
