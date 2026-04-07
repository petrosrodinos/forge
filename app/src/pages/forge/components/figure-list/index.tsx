import { forwardRef, useImperativeHandle, useState } from "react";
import { createPortal } from "react-dom";
import { Box, ImageOff, Plus, Trash2, Pencil } from "lucide-react";
import { useFigures, useCreateFigure, useUpdateFigure, useDeleteFigure } from "@/features/figures/hooks/use-figures.hooks";
import { useForgeStore } from "@/store/forgeStore";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Figure } from "@/interfaces";

/** Forge figure kinds; batch script mirrors this list in `api/src/config/figure-types.ts` — keep both in sync. */
const FIGURE_TYPES = [
  { value: "humanoid", label: "Humanoid" },
  { value: "creature", label: "Creature" },
  { value: "npc", label: "NPC" },
  { value: "obstacle", label: "Obstacle" },
  { value: "weapon", label: "Weapon" },
  { value: "armor", label: "Armor" },
  { value: "vehicle", label: "Vehicle" },
  { value: "mount", label: "Mount" },
  { value: "building", label: "Building" },
  { value: "environment_prop", label: "Environment Prop" },
  { value: "item", label: "Item / Collectible" },
  { value: "projectile", label: "Projectile" },
  { value: "effect", label: "Effect" },
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
      handleSelect(created);
    } else if (modal.figure) {
      await updateFigure.mutateAsync({ id: modal.figure.id, dto: { name: modal.name.trim(), type: modal.type } });
    }
    closeModal();
  }

  const isPending = modal?.mode === "create" ? createFigure.isPending : updateFigure.isPending;

  function handleConfirmDelete() {
    if (!pendingDelete || deleteFigure.isPending) return;
    const id = pendingDelete.id;
    deleteFigure.mutate(id, { onSettled: () => setPendingDelete(null) });
  }

  const compactThumbUrl = figureThumbUrl(activeFigure);

  return (
    <>
      <div className="flex flex-col h-full min-h-0">
        {collapsed ? (
          <div className="flex flex-col flex-1 items-center py-3 px-1.5 gap-3 min-h-0">
            {isLoading ? (
              <Skeleton className="h-10 w-10 shrink-0 rounded-lg ring-1 ring-white/5" />
            ) : (
              <button
                type="button"
                onClick={() => setFigurePanelOpen(true)}
                className={cn(
                  "h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border/80 bg-surface ring-1 ring-white/5 transition-all",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                  "hover:border-accent/40",
                  activeFigure && "ring-2 ring-accent/35 border-accent/30",
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
              className="shrink-0 rounded-lg p-2 text-slate-400 ring-1 ring-transparent hover:bg-surface hover:text-accent-light hover:ring-border/60"
              title="New figure"
              aria-label="New figure"
            >
              <Plus size={18} strokeWidth={2} />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex shrink-0 items-center justify-between border-b border-border/80 bg-surface/35 px-3 py-2.5">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/12 text-accent-light ring-1 ring-accent/20">
                  <Box className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                </span>
                Figures
              </span>
              <Button variant="ghost" size="sm" onClick={openCreate} className="rounded-lg p-1.5" aria-label="New figure">
                <Plus size={15} strokeWidth={2} />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto py-2 px-1.5">
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
                      "group flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 transition-colors",
                      "hover:bg-surface/80",
                      activeFigure?.id === fig.id &&
                        "bg-accent/12 text-accent-light ring-1 ring-accent/25 shadow-sm shadow-black/10",
                    )}
                    onClick={() => handleSelect(fig)}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/80 bg-surface ring-1 ring-white/5">
                        {thumbUrl ? (
                          <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ImageOff className="w-4 h-4 text-slate-600 shrink-0" strokeWidth={1.5} aria-hidden />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-200">{fig.name}</p>
                        <p className="text-[10px] text-slate-500">{fig.type}</p>
                      </div>
                    </div>
                    <div className="ml-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={closeModal} aria-hidden />
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="relative z-10 flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-panel shadow-2xl shadow-black/40 ring-1 ring-white/5"
          >
            <div className="border-b border-border/80 bg-surface/40 px-5 py-4">
              <p className="text-sm font-semibold tracking-tight text-slate-100">
                {modal.mode === "create" ? "New figure" : "Edit figure"}
              </p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                {modal.mode === "create" ? "Choose a name and asset type to start your figure." : "Update how this figure is labeled in the forge."}
              </p>
            </div>
            <div className="flex flex-col gap-4 px-5 py-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-slate-500">Name</label>
                <input
                  autoFocus
                  value={modal.name}
                  onChange={(e) => setModal({ ...modal, name: e.target.value })}
                  placeholder="Figure name…"
                  className="w-full rounded-lg border border-border/80 bg-surface/60 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 transition-colors focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-slate-500">Type</label>
                <select
                  value={modal.type}
                  onChange={(e) => setModal({ ...modal, type: e.target.value })}
                  className="w-full rounded-lg border border-border/80 bg-surface/60 px-3 py-2.5 text-sm text-slate-200 transition-colors focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                >
                  {FIGURE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending || !modal.name.trim()}>
                  {isPending
                    ? modal.mode === "create"
                      ? "Creating…"
                      : "Saving…"
                    : modal.mode === "create"
                      ? "Create"
                      : "Save"}
                </Button>
              </div>
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
        confirmLoading={deleteFigure.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
        danger
      />
    </>
  );
});
