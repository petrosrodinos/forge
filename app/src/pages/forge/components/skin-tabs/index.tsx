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
      <div className="flex shrink-0 items-stretch border-b border-border bg-panel">
        <div className="flex min-w-0 flex-1 items-end gap-0 overflow-x-auto">
          {skins.map((skin) => (
            <div key={skin.id} className="group/tab flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => setActiveSkin(skin)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition-colors",
                  activeSkin?.id === skin.id
                    ? "border-accent-light text-slate-100"
                    : "border-transparent text-slate-500 hover:text-slate-300",
                )}
              >
                {skin.name ?? "Skin"}
              </button>
              <div className="mb-px flex items-center gap-0 pr-0.5 opacity-40 transition-opacity hover:opacity-100 sm:opacity-0 sm:group-hover/tab:opacity-100">
                <button
                  type="button"
                  onClick={(e) => openEdit(e, skin)}
                  className="p-1 text-slate-600 hover:text-slate-300"
                  title="Rename skin"
                >
                  <Pencil size={11} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDelete(skin);
                  }}
                  className="p-1 text-slate-600 hover:text-red-400"
                  title="Delete skin"
                >
                  <X size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onAddSkin}
          className="shrink-0 px-2.5 py-2 text-slate-500 hover:text-slate-300"
          title="Add skin"
          aria-label="Add skin"
        >
          <Plus size={15} strokeWidth={2} />
        </button>
      </div>

      {editingSkin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setEditingSkin(null)} aria-hidden />
          <form
            onSubmit={handleEditSubmit}
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-panel shadow-2xl shadow-black/40 ring-1 ring-white/5"
          >
            <div className="border-b border-border/80 bg-surface/40 px-5 py-4">
              <p className="text-sm font-semibold tracking-tight text-slate-100">Rename skin</p>
            </div>
            <div className="flex flex-col gap-4 px-5 py-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="rename-skin" className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Name
                </label>
                <input
                  id="rename-skin"
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Skin name…"
                  className="w-full rounded-lg border border-border/80 bg-surface/60 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 transition-colors focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingSkin(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={updateSkin.isPending || !editName.trim()}>
                  {updateSkin.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
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
