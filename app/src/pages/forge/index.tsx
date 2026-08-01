import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
} from "@/features/projects/hooks/use-projects.hooks";
import type { Project } from "@/features/projects/interfaces/project.interfaces";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OptionsMenu } from "@/components/ui/OptionsMenu";

export default function ForgePage() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [renameTarget, setRenameTarget] = useState<Project | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  function openCreate() {
    setCreateName("");
    setCreateOpen(true);
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim()) return;
    const created = await createProject.mutateAsync({ name: createName.trim() });
    setCreateOpen(false);
    navigate(`/forge/${created.id}`);
  }

  function openRename(project: Project) {
    setRenameTarget(project);
    setRenameValue(project.name);
  }

  async function submitRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;
    await updateProject.mutateAsync({ id: renameTarget.id, dto: { name: renameValue.trim() } });
    setRenameTarget(null);
  }

  function handleDelete() {
    if (!deleteTarget || deleteProject.isPending) return;
    deleteProject.mutate(deleteTarget.id, {
      onSettled: () => setDeleteTarget(null),
    });
  }

  return (
    <div className="relative h-full overflow-y-auto">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-accent/12 via-accent/5 to-transparent" aria-hidden />
      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Projects</h1>
            <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-slate-500">
              Organize figures into projects. Open a project to forge skins, variants, and 3D assets.
            </p>
          </div>
          <Button type="button" onClick={openCreate} className="shrink-0 self-start sm:self-auto">
            <Plus size={16} strokeWidth={2} aria-hidden />
            New project
          </Button>
        </header>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : projects && projects.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <li key={project.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/forge/${project.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/forge/${project.id}`);
                    }
                  }}
                  className="group relative flex h-full cursor-pointer flex-col rounded-xl border border-border/80 bg-panel/90 p-4 ring-1 ring-white/5 transition-colors hover:border-accent/35 hover:bg-panel hover:ring-accent/20"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent-light ring-1 ring-accent/25">
                      <FolderKanban size={18} strokeWidth={1.5} aria-hidden />
                    </div>
                    <OptionsMenu
                      menuLabel={`Actions for ${project.name}`}
                      items={[
                        {
                          id: "rename",
                          label: "Rename",
                          icon: Pencil,
                          onSelect: () => openRename(project),
                        },
                        {
                          id: "delete",
                          label: "Delete",
                          icon: Trash2,
                          destructive: true,
                          onSelect: () => setDeleteTarget(project),
                        },
                      ]}
                    />
                  </div>
                  <p className="truncate text-sm font-semibold tracking-tight text-slate-100 group-hover:text-accent-light">
                    {project.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {project._count.figures} {project._count.figures === 1 ? "figure" : "figures"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-panel/60 px-6 py-16 text-center ring-1 ring-white/5">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent-light ring-1 ring-accent/25">
              <FolderKanban size={28} strokeWidth={1.35} aria-hidden />
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-100">No projects yet</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              Create a project to start grouping figures and opening the forge.
            </p>
            <Button type="button" className="mt-6" onClick={openCreate}>
              <Plus size={16} strokeWidth={2} aria-hidden />
              Create project
            </Button>
          </div>
        )}
      </div>

      {createOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setCreateOpen(false)} aria-hidden />
            <form
              onSubmit={(e) => void submitCreate(e)}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-panel shadow-2xl shadow-black/40 ring-1 ring-white/5"
            >
              <div className="border-b border-border/80 bg-surface/40 px-5 py-4">
                <p className="text-sm font-semibold tracking-tight text-slate-100">New project</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">Give your project a name to get started.</p>
              </div>
              <div className="flex flex-col gap-4 px-5 py-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="create-project-name" className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Name
                  </label>
                  <input
                    id="create-project-name"
                    autoFocus
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Project name…"
                    className="w-full rounded-lg border border-border/80 bg-surface/60 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 transition-colors focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={createProject.isPending || !createName.trim()}>
                    {createProject.isPending ? "Creating…" : "Create"}
                  </Button>
                </div>
              </div>
            </form>
          </div>,
          document.body,
        )}

      {renameTarget &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setRenameTarget(null)} aria-hidden />
            <form
              onSubmit={(e) => void submitRename(e)}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-panel shadow-2xl shadow-black/40 ring-1 ring-white/5"
            >
              <div className="border-b border-border/80 bg-surface/40 px-5 py-4">
                <p className="text-sm font-semibold tracking-tight text-slate-100">Rename project</p>
              </div>
              <div className="flex flex-col gap-4 px-5 py-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="rename-project-name" className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Name
                  </label>
                  <input
                    id="rename-project-name"
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="w-full rounded-lg border border-border/80 bg-surface/60 px-3 py-2.5 text-sm text-slate-200 transition-colors focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setRenameTarget(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={updateProject.isPending || !renameValue.trim()}>
                    {updateProject.isPending ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            </form>
          </div>,
          document.body,
        )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        description="Figures in this project will not be deleted. They will remain available in other projects they belong to."
        confirmLabel="Delete"
        confirmLoading={deleteProject.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </div>
  );
}
