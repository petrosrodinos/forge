import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useFigures, useCreateFigure, useDeleteFigure } from "@/features/figures/hooks/use-figures.hooks";
import { useForgeStore } from "@/store/forgeStore";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import type { Figure } from "@/interfaces";

export function FigureList() {
  const { data: figures, isLoading } = useFigures();
  const createFigure = useCreateFigure();
  const deleteFigure = useDeleteFigure();
  const { activeFigure, setActiveFigure } = useForgeStore();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  function handleSelect(fig: Figure) {
    setActiveFigure(fig);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await createFigure.mutateAsync({ name: newName.trim(), type: "humanoid" });
    setNewName("");
    setCreating(false);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Figures
        </span>
        <Button variant="ghost" size="sm" onClick={() => setCreating((v) => !v)} className="p-1">
          <Plus size={14} />
        </Button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="px-3 py-2 border-b border-border">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Figure name…"
            className="w-full bg-surface border border-border rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-accent/50"
          />
        </form>
      )}

      <div className="flex-1 overflow-y-auto py-1">
        {isLoading && (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        )}
        {figures?.map((fig) => (
          <div
            key={fig.id}
            className={cn(
              "group flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-white/5 transition-colors",
              activeFigure?.id === fig.id && "bg-accent/10 text-accent-light",
            )}
            onClick={() => handleSelect(fig)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{fig.name}</p>
              <p className="text-[10px] text-slate-500">{fig.type}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 p-0.5 ml-1"
              onClick={(e) => {
                e.stopPropagation();
                deleteFigure.mutate(fig.id);
              }}
            >
              <Trash2 size={12} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
