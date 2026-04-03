import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";
import { useFigures } from "@/features/figures/hooks/use-figures.hooks";
import { useCreateSkin, useDeleteSkin } from "@/features/skins/hooks/use-skins.hooks";
import { useForgeStore } from "@/store/forgeStore";
import { FigureList } from "@/pages/forge/components/figure-list";
import { SkinTabs } from "@/pages/forge/components/skin-tabs";
import { SkinPanel } from "@/pages/forge/components/skin-panel";
import { ChatPanel } from "@/pages/forge/components/chat-panel";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Skin } from "@/interfaces";

function ForgeSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-panel shrink-0">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${i === 0 ? "w-12" : i === 1 ? "w-16" : "w-10"}`} />
        ))}
      </div>
      <div className="flex items-center gap-3 px-3 py-2 border-b border-border shrink-0">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 w-16" />
        ))}
      </div>
      <div className="flex flex-col gap-5 px-4 py-5">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-7 w-14" />
          <Skeleton className="h-7 w-28" />
        </div>
      </div>
    </div>
  );
}

export default function ForgePage() {
  const { data: figures, isLoading } = useFigures();
  const {
    activeFigure,
    setActiveFigure,
    activeSkin,
    setActiveSkin,
    syncFigureData,
    chatPanelOpen,
    setChatPanelOpen,
    figurePanelOpen,
    setFigurePanelOpen,
  } = useForgeStore();

  const activeFigureId = activeFigure?.id;

  const [addSkinOpen, setAddSkinOpen] = useState(false);
  const [newSkinName, setNewSkinName] = useState("");

  const createSkin = useCreateSkin();
  const deleteSkin = useDeleteSkin();

  useEffect(() => {
    if (!figures || figures.length === 0) return;
    const stillExists = activeFigure && figures.some((f) => f.id === activeFigure.id);
    if (!stillExists) {
      setActiveFigure(figures[0]);
      setActiveSkin(figures[0].skins[0] ?? null);
    }
  }, [figures, activeFigure, setActiveFigure, setActiveSkin]);

  useEffect(() => {
    if (activeFigure && !activeSkin && activeFigure.skins.length > 0) {
      setActiveSkin(activeFigure.skins[0]);
    }
  }, [activeFigure, activeSkin, setActiveSkin]);

  useEffect(() => {
    if (!figures || !activeFigureId) return;
    const fresh = figures.find((f) => f.id === activeFigureId);
    if (!fresh) return;
    syncFigureData(fresh);
  }, [figures, activeFigureId, syncFigureData]);

  function handleDeleteSkin(skin: Skin) {
    if (!activeFigure) return;
    if (activeSkin?.id === skin.id) {
      const next = activeFigure.skins.find((s) => s.id !== skin.id);
      setActiveSkin(next ?? null);
    }
    deleteSkin.mutate({ figureId: activeFigure.id, skinId: skin.id });
  }

  function openAddSkin() {
    setNewSkinName("");
    setAddSkinOpen(true);
  }

  function submitAddSkin(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFigure) return;
    createSkin.mutate(
      { figureId: activeFigure.id, name: newSkinName.trim() || "New Skin" },
      { onSuccess: (skin) => { setActiveSkin(skin); setAddSkinOpen(false); } },
    );
  }

  return (
    <>
      {/* Mobile backdrop */}
      {figurePanelOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setFigurePanelOpen(false)}
        />
      )}

      <div className="flex h-full overflow-hidden">
        {/* Left sidebar — drawer on mobile, inline on desktop */}
        <aside
          className={cn(
            "flex flex-col w-52 shrink-0 border-r border-border bg-panel overflow-hidden",
            // Mobile: fixed drawer sliding in from the left
            "fixed top-0 bottom-0 left-0 z-40 transition-transform duration-200",
            figurePanelOpen ? "translate-x-0" : "-translate-x-full",
            // Desktop: inline, no transform, collapses by width
            "md:relative md:top-auto md:bottom-auto md:left-auto md:z-auto md:translate-x-0 md:transition-none",
            !figurePanelOpen && "md:w-0 md:border-r-0",
          )}
        >
          <FigureList />
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
          {/* Desktop sidebar toggle */}
          <button
            onClick={() => setFigurePanelOpen(!figurePanelOpen)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-4 h-8 bg-panel border border-border rounded-r text-slate-400 hover:text-slate-200 hover:bg-surface transition-colors"
          >
            {figurePanelOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
          </button>

          {isLoading && !activeFigure ? (
            <ForgeSkeleton />
          ) : activeFigure ? (
            <>
              <SkinTabs
                skins={activeFigure.skins}
                figureId={activeFigure.id}
                onAddSkin={openAddSkin}
                onDeleteSkin={handleDeleteSkin}
              />
              <div className="flex-1 overflow-hidden">
                {activeFigure.skins.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
                    <p className="text-sm">No skins yet — click <strong className="text-slate-300">+</strong> to add one</p>
                    <button
                      onClick={openAddSkin}
                      className="text-xs px-3 py-1.5 bg-accent/20 border border-accent/40 text-accent-light rounded hover:bg-accent/30 transition-colors"
                    >
                      + Add Skin
                    </button>
                  </div>
                ) : activeSkin ? (
                  <SkinPanel skin={activeSkin} figureId={activeFigure.id} />
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-slate-500">
              Select a figure from the left panel to start
            </div>
          )}
        </div>

        <button
          onClick={() => setChatPanelOpen(!chatPanelOpen)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-4 h-8 bg-panel border border-border rounded-l text-slate-400 hover:text-slate-200 hover:bg-surface transition-colors"
        >
          {chatPanelOpen ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {chatPanelOpen && (
          <aside className="w-80 shrink-0 border-l border-border bg-panel overflow-hidden flex flex-col">
            <ChatPanel />
          </aside>
        )}
      </div>

      {addSkinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAddSkinOpen(false)} />
          <form
            onSubmit={submitAddSkin}
            className="relative z-10 bg-panel border border-border rounded-lg p-5 w-72 flex flex-col gap-4 shadow-xl"
          >
            <p className="text-sm font-semibold text-slate-100">New Skin</p>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Skin name</label>
              <input
                autoFocus
                value={newSkinName}
                onChange={(e) => setNewSkinName(e.target.value)}
                placeholder="Skin name…"
                className="w-full bg-surface border border-border rounded px-3 py-2.5 text-base text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent/50"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => setAddSkinOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createSkin.isPending}>
                {createSkin.isPending ? "Adding…" : "Add"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
