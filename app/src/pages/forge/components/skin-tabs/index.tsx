import { Plus } from "lucide-react";
import { useForgeStore } from "@/store/forgeStore";
import { cn } from "@/utils/cn";
import type { Skin } from "@/interfaces";

interface SkinTabsProps {
  skins: Skin[];
  onAddSkin: () => void;
}

export function SkinTabs({ skins, onAddSkin }: SkinTabsProps) {
  const { activeSkin, setActiveSkin } = useForgeStore();

  return (
    <div className="flex items-center gap-1 px-4 border-b border-border bg-panel shrink-0 overflow-x-auto">
      {skins.map((skin) => (
        <button
          key={skin.id}
          onClick={() => setActiveSkin(skin)}
          className={cn(
            "text-xs px-3 py-2 whitespace-nowrap border-b-2 transition-colors",
            activeSkin?.id === skin.id
              ? "border-accent text-slate-100"
              : "border-transparent text-slate-400 hover:text-slate-200",
          )}
        >
          {skin.isBase ? "Base" : (skin.name ?? "Skin")}
        </button>
      ))}
      <button
        onClick={onAddSkin}
        className="text-xs px-2 py-2 text-slate-500 hover:text-slate-300 transition-colors"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
