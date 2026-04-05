import { forwardRef, useImperativeHandle, useState } from "react";
import { createPortal } from "react-dom";
import { ImageOff, Plus, Trash2, Pencil } from "lucide-react";
import { useFigures, useCreateFigure, useUpdateFigure, useDeleteFigure } from "@/features/figures/hooks/use-figures.hooks";
import { useForgeStore } from "@/store/forgeStore";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Figure } from "@/interfaces";

const FIGURE_TYPES = [
  { value: "humanoid",         label: "Humanoid" },
  { value: "creature",         label: "Creature" },
  { value: "npc",              label: "NPC" },
  { value: "obstacle",         label: "Obstacle" },
  { value: "weapon",           label: "Weapon" },
  { value: "armor",            label: "Armor" },
  { value: "vehicle",          label: "Vehicle" },
  { value: "mount",            label: "Mount" },
  { value: "building",         label: "Building" },
  { value: "environment_prop", label: "Environment Prop" },
  { value: "item",             label: "Item / Collectible" },
  { value: "projectile",       label: "Projectile" },
  { value: "effect",           label: "Effect" },
] as const;

interface FigureModalState {
  mode: "create" | "edit";
  figure?: Figure;
  name: string;
  type: string;
}

const CLOSED: FigureModalState | null = null;

function figureThumbUrl(fig: Figure | null): string | null {
  if (!fig) return null;
  const thumb = fig.skins[0]?.variants[0]?.images[0];
  return thumb?.gcsUrl ?? thumb?.sourceUrl ?? null;
}

export type FigureListHandle = {
  openCreateModal: () => void;
};

interface FigureListProps {
  /** Desktop collapsed rail: only active thumb + new figure (mobile drawer ignores via parent) */
  collapsed?: boolean;
}

export const FigureList = forwardRef<FigureListHandle, FigureListProps>(function FigureList(
  { collapsed = false },
  ref,
) {
  const { data: figures, isLoading } = useFigures();
  const createFigure = useCreateFigure();
  const updateFigure = useUpdateFigure();
  const deleteFigure = useDeleteFigure();
  const { activeFigure, setActiveFigure, setActiveSkin, setFigurePanelOpen } = useForgeStore();
  const [modal, setModal] = useState<FigureModalState | null>(CLOSED);
  const [pendingDelete, setPendingDelete] = useState<Figure | null>(null);

  function openCreate() {
    setModal({ mode: "create", name: "", type: FIGURE_TYPES[0].value });
  }

  useImperativeHandle(ref, () => ({
    openCreateModal: () => {
      setFigurePanelOpen(true);
      setModal({ mode: "create", name: "", type: FIGURE_TYPES[0].value });
    },
  }));

  function openEdit(e: React.MouseEvent, fig: Figure) {
    e.stopPropagation();
    setModal({ mode: "edit", figure: fig, name: fig.name, type: fig.type });
  }

  function closeModal() {
    setModal(null);
  }

  function handleSelect(fig: Figure) {
    setActiveFigure(fig);
    setActiveSkin(fig.skins[0] ?? null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!modal || !modal.name.trim()) return;
    if (modal.mode === "create") {
      const created = await createFigure.mutateAsync({ name: modal.name.trim(), type: modal.type });
      setActiveFigure(created);
      setActiveSkin(null);
    } else if (modal.figure) {
      await updateFigure.mutateAsync({ id: modal.figure.id, dto: { name: modal.name.trim(), type: modal.type } });
    }
    closeModal();
  }

  const isPending = modal?.mode === "create" ? createFigure.isPending : updateFigure.isPending;

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    deleteFigure.mutate(pendingDelete.id);
    setPendingDelete(null);
  }

  const compactThumbUrl = figureThumbUrl(activeFigure);

  return (
    <>
      <div className="flex flex-col h-full min-h-0">
        {collapsed ? (
          <div className="flex flex-col flex-1 items-center py-3 px-1.5 gap-3 min-h-0">
            {isLoading ? (
              <Skeleton className="w-10 h-10 rounded-md shrink-0" />
            ) : (
              <button
                type="button"
                onClick={() => setFigurePanelOpen(true)}
                className={cn(
                  "w-10 h-10 rounded-md overflow-hidden border bg-surface shrink-0",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                  "hover:border-accent/50 border-border transition-colors",
                  activeFigure && "ring-1 ring-accent/20",
                )}
                title="Expand figure list"
                aria-label="Expand figure list"
              >
                {compactThumbUrl ? (
                  <img src={compactThumbUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-surface" aria-hidden>
                    <ImageOff className="w-4 h-4 text-slate-600" strokeWidth={1.5} />
                  </div>
                )}
              </button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={openCreate}
              className="p-1.5 text-slate-400 hover:text-accent-light shrink-0"
              title="New figure"
              aria-label="New figure"
            >
              <Plus size={18} strokeWidth={2} />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Figures
              </span>
              <Button variant="ghost" size="sm" onClick={openCreate} className="p-1" aria-label="New figure">
                <Plus size={14} />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto py-1 min-h-0">
              {isLoading && (
                <div className="flex flex-col gap-0 py-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="px-3 py-2 flex items-center gap-2">
                      <Skeleton className="w-8 h-8 rounded shrink-0" />
                      <div className="flex flex-col gap-1.5 flex-1">
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-2.5 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {figures?.map((fig) => {
                const thumbUrl = figureThumbUrl(fig);
                return (
                  <div
                    key={fig.id}
                    className={cn(
                      "group flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-white/5 transition-colors",
                      activeFigure?.id === fig.id && "bg-accent/10 text-accent-light",
                    )}
                    onClick={() => handleSelect(fig)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded shrink-0 overflow-hidden bg-surface border border-border flex items-center justify-center">
                        {thumbUrl ? (
                          <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ImageOff className="w-4 h-4 text-slate-600 shrink-0" strokeWidth={1.5} aria-hidden />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{fig.name}</p>
                        <p className="text-[10px] text-slate-500">{fig.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 ml-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0.5"
                        onClick={(e) => openEdit(e, fig)}
                      >
                        <Pencil size={11} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDelete(fig);
                        }}
                      >
                        <Trash2 size={11} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Figure modal */}
      {modal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="relative z-10 bg-panel border border-border rounded-lg p-5 w-72 flex flex-col gap-4 shadow-xl"
          >
            <p className="text-sm font-semibold text-slate-100">
              {modal.mode === "create" ? "New Figure" : "Edit Figure"}
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Name</label>
              <input
                autoFocus
                value={modal.name}
                onChange={(e) => setModal({ ...modal, name: e.target.value })}
                placeholder="Figure name…"
                className="w-full bg-surface border border-border rounded px-3 py-2.5 text-base text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent/50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Type</label>
              <select
                value={modal.type}
                onChange={(e) => setModal({ ...modal, type: e.target.value })}
                className="w-full bg-surface border border-border rounded px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-accent/50"
              >
                {FIGURE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isPending || !modal.name.trim()}>
                {isPending
                  ? modal.mode === "create" ? "Creating…" : "Saving…"
                  : modal.mode === "create" ? "Create" : "Save"}
              </Button>
            </div>
          </form>
        </div>,
        document.body,
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.name}"?`}
        description="All skins, images, and 3D models for this figure will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
        danger
      />
    </>
  );
});
