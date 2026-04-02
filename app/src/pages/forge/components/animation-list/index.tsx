import { useState } from "react";
import { ModelViewer } from "@/pages/forge/components/model-card/model-viewer";
import { cn } from "@/utils/cn";
import { Badge } from "@/components/ui/Badge";
import type { Animation } from "@/interfaces";

interface AnimationListProps {
  model3dId: string;
  animations: Animation[];
}

export function AnimationList({ animations }: AnimationListProps) {
  const [activeKey, setActiveKey] = useState<string | null>(
    animations[0]?.animationKey ?? null,
  );

  const active = animations.find((a) => a.animationKey === activeKey);

  if (animations.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex items-center gap-1 overflow-x-auto">
        {animations.map((a) => (
          <button
            key={a.id}
            onClick={() => setActiveKey(a.animationKey)}
            className={cn(
              "text-xs px-2.5 py-1 rounded border whitespace-nowrap transition-colors",
              activeKey === a.animationKey
                ? "border-accent/40 text-accent-light bg-accent/10"
                : "border-border text-slate-400 hover:text-slate-200",
            )}
          >
            {a.animationKey}
          </button>
        ))}
      </div>
      {active && (
        <div className="flex flex-col gap-1">
          <Badge status={active.status} />
          {active.gcsGlbUrl && (
            <ModelViewer
              src={active.gcsGlbUrl}
              animationName={active.animationKey}
            />
          )}
        </div>
      )}
    </div>
  );
}
