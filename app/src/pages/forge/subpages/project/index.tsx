import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, ChevronLeft, ChevronRight, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { DownloadModal } from "@/pages/forge/components/download-modal";
import { cn } from "@/utils/cn";
import {
  useDeleteProject,
  useProject,
  useProjectFigures,
  useUpdateProject,
} from "@/features/projects/hooks/use-projects.hooks";
import { useCreateSkin, useDeleteSkin } from "@/features/skins/hooks/use-skins.hooks";
import { useForgeStore } from "@/store/forgeStore";
import { FigureList, type FigureListHandle } from "@/pages/forge/components/figure-list";
import { SkinTabs } from "@/pages/forge/components/skin-tabs";
import { SkinPanel } from "@/pages/forge/components/skin-panel";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OptionsMenu } from "@/components/ui/OptionsMenu";
import type { Skin } from "@/interfaces";

function ForgeSkeleton() {
  return (
    <div className="relative flex flex-col h-full min-w-0">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-accent/8 to-transparent" aria-hidden />
      <div className="relative flex items-center gap-2 px-3 py-2.5 border-b border-border/80 bg-surface/50 shrink-0">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className={`h-8 rounded-lg ${i === 0 ? "w-20" : i === 1 ? "w-24" : "w-16"}`} />
        ))}
      </div>
      <div className="relative flex items-center gap-2 px-3 py-2 border-b border-border/80 bg-panel/40 shrink-0">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-md" />
        ))}
      </div>
      <div className="relative flex flex-col gap-5 px-4 py-5">
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

export default function ProjectForgePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading: projectLoading, isError: projectError } = useProject(projectId);
  const { data: figures, isLoading } = useProjectFigures(projectId);
  const {
    activeFigure,
    setActiveFigure,
    activeSkin,
    setActiveSkin,
    syncFigureData,
    figurePanelOpen,
    setFigurePanelOpen,
  } = useForgeStore();

  const activeFigureId = activeFigure?.id;

  const figureListRef = useRef<FigureListHandle>(null);
  const [addSkinOpen, setAddSkinOpen] = useState(false);
  const [newSkinName, setNewSkinName] = useState("");
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const createSkin = useCreateSkin();
  const deleteSkin = useDeleteSkin();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  useEffect(() => {
    if (!figures) return;
    if (figures.length === 0) {
      if (activeFigure) setActiveFigure(null);
      return;
    }
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

  function handleDeleteSkin(skin: Skin, opts?: { onSettled?: () => void }) {
    if (!activeFigure) return;
    if (activeSkin?.id === skin.id) {
      const next = activeFigure.skins.find((s) => s.id !== skin.id);
      setActiveSkin(next ?? null);
    }
    deleteSkin.mutate(
      { figureId: activeFigure.id, skinId: skin.id },
      { onSettled: opts?.onSettled },
    );
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

  function openRename() {
    if (!project) return;
    setRenameValue(project.name);
    setRenameOpen(true);
  }

  function submitRename(e: React.FormEvent) {
    e.preventDefault();
    if (!project || !renameValue.trim()) return;
    updateProject.mutate(
      { id: project.id, dto: { name: renameValue.trim() } },
      { onSuccess: () => setRenameOpen(false) },
    );
  }

  function handleDeleteProject() {
    if (!project || deleteProject.isPending) return;
    deleteProject.mutate(project.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        navigate("/forge", { replace: true });
      },
    });
  }

  if (!projectId || projectError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-slate-400">Project not found.</p>
        <Button type="button" size="sm" variant="secondary" onClick={() => navigate("/forge")}>
          Back to projects
        </Button>
      </div>
    );
  }

  if (projectLoading && !project) {
    return (
      <div className="flex h-full items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <>
      {figurePanelOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setFigurePanelOpen(false)}
        />
      )}
      <div className="flex h-full flex-col overflow-hidden">
        <div className="relative z-10 flex shrink-0 items-center gap-2 border-b border-border/80 bg-panel/95 px-3 py-2 ring-1 ring-white/5">
          <button
            type="button"
            onClick={() => navigate("/forge")}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
            aria-label="Back to projects"
          >
            <ChevronLeft size={16} />
            <span className="hidden text-xs sm:inline">Projects</span>
          </button>
          <div className="h-4 w-px bg-border/80" aria-hidden />
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-slate-100">
            {project?.name ?? "Project"}
          </h1>
          <OptionsMenu
            menuLabel="Project actions"
            items={[
              { id: "rename", label: "Rename", icon: Pencil, onSelect: openRename },
              {
                id: "delete",
                label: "Delete project",
                icon: Trash2,
                destructive: true,
                onSelect: () => setDeleteOpen(true),
              },
            ]}
          />
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside
            className={cn(
              "flex flex-col shrink-0 border-r border-border/80 bg-panel/95 overflow-hidden ring-1 ring-white/5",
              "w-52",
              "fixed top-0 bottom-0 left-0 z-40 transition-transform duration-200",
              figurePanelOpen ? "translate-x-0" : "-translate-x-full",
              "md:relative md:top-auto md:bottom-auto md:left-auto md:z-auto md:translate-x-0",
              "md:transition-[width] md:duration-200 md:ease-out",
              figurePanelOpen ? "md:w-52" : "md:w-[3.25rem]",
            )}
          >
            <FigureList
              ref={figureListRef}
              projectId={projectId}
              collapsed={!figurePanelOpen}
              onDownloadClick={() => setDownloadModalOpen(true)}
            />
          </aside>

          <div className="relative flex-1 flex flex-col overflow-hidden min-w-0 bg-surface/30">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-accent/10 via-accent/4 to-transparent"
              aria-hidden
            />
            <button
              type="button"
              onClick={() => setFigurePanelOpen(!figurePanelOpen)}
              className="absolute left-0 top-1/2 z-10 hidden h-9 w-5 -translate-y-1/2 items-center justify-center rounded-r-md border border-border/80 bg-panel/95 text-slate-400 shadow-sm ring-1 ring-white/5 transition-colors hover:bg-surface hover:text-slate-200 md:flex"
              aria-label={figurePanelOpen ? "Collapse figure list" : "Expand figure list"}
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
                  skinDeleteInProgress={deleteSkin.isPending}
                />
                <div className="relative z-0 flex-1 overflow-hidden min-h-0">
                  {activeFigure.skins.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 py-12 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent-light ring-1 ring-accent/25">
                        <Layers className="h-7 w-7" strokeWidth={1.25} aria-hidden />
                      </div>
                      <div className="max-w-xs space-y-2">
                        <p className="text-sm font-medium text-slate-200">No skins yet</p>
                        <p className="text-sm text-slate-500 leading-relaxed">
                          Add a skin to hold variants, prompts, and renders for this figure.
                        </p>
                      </div>
                      <Button type="button" size="sm" onClick={openAddSkin}>
                        <Plus size={16} strokeWidth={2} aria-hidden />
                        Add skin
                      </Button>
                    </div>
                  ) : activeSkin ? (
                    <SkinPanel
                      skin={activeSkin}
                      figureId={activeFigure.id}
                      figureType={activeFigure.type}
                      figureName={activeFigure.name}
                    />
                  ) : null}
                </div>
              </>
            ) : Array.isArray(figures) && figures.length === 0 ? (
              <div className="relative z-0 flex h-full flex-col items-center justify-center px-6 py-12 text-center">
                <div
                  className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border border-border/80 bg-panel/80 ring-1 ring-accent/20 shadow-lg shadow-black/20"
                  aria-hidden
                >
                  <Box className="h-11 w-11 text-accent-light" strokeWidth={1.35} />
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-100 mb-2">No figures yet</h2>
                <p className="text-sm text-slate-500 max-w-sm mb-8 leading-relaxed">
                  Create a figure to organize skins, textures, and 3D models for your character or asset.
                </p>
                <Button
                  type="button"
                  size="lg"
                  onClick={() => figureListRef.current?.openCreateModal()}
                  className="shadow-lg shadow-accent/20"
                >
                  <Plus size={18} strokeWidth={2} aria-hidden />
                  Create figure
                </Button>
              </div>
            ) : (
              <div className="relative z-0 flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-panel/60 text-slate-500 ring-1 ring-white/5">
                  <Box className="h-6 w-6 opacity-90" strokeWidth={1.25} aria-hidden />
                </div>
                <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                  Select a figure from the left panel to open skins and variants.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {downloadModalOpen && <DownloadModal projectId={projectId} onClose={() => setDownloadModalOpen(false)} />}

      {addSkinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setAddSkinOpen(false)} aria-hidden />
          <form
            onSubmit={submitAddSkin}
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-panel shadow-2xl shadow-black/40 ring-1 ring-white/5"
          >
            <div className="border-b border-border/80 bg-surface/40 px-5 py-4">
              <p className="text-sm font-semibold tracking-tight text-slate-100">New skin</p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">Name it anything you like — you can rename later.</p>
            </div>
            <div className="flex flex-col gap-4 px-5 py-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-skin-name" className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Skin name
                </label>
                <input
                  id="new-skin-name"
                  autoFocus
                  value={newSkinName}
                  onChange={(e) => setNewSkinName(e.target.value)}
                  placeholder="e.g. Default, Battle damage…"
                  className="w-full rounded-lg border border-border/80 bg-surface/60 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 transition-colors focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setAddSkinOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={createSkin.isPending}>
                  {createSkin.isPending ? "Adding…" : "Add skin"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {renameOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setRenameOpen(false)} aria-hidden />
          <form
            onSubmit={submitRename}
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-panel shadow-2xl shadow-black/40 ring-1 ring-white/5"
          >
            <div className="border-b border-border/80 bg-surface/40 px-5 py-4">
              <p className="text-sm font-semibold tracking-tight text-slate-100">Rename project</p>
            </div>
            <div className="flex flex-col gap-4 px-5 py-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="rename-project" className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Project name
                </label>
                <input
                  id="rename-project"
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="w-full rounded-lg border border-border/80 bg-surface/60 px-3 py-2.5 text-sm text-slate-200 transition-colors focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setRenameOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={updateProject.isPending || !renameValue.trim()}>
                  {updateProject.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title={`Delete "${project?.name}"?`}
        description="Figures in this project will not be deleted. They will remain available in other projects they belong to."
        confirmLabel="Delete"
        confirmLoading={deleteProject.isPending}
        onConfirm={handleDeleteProject}
        onCancel={() => setDeleteOpen(false)}
        danger
      />
    </>
  );
}
