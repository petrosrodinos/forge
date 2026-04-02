import { Badge } from "@/components/ui/Badge";
import { ModelViewer } from "@/pages/forge/components/model-card/model-viewer";
import { AnimationList } from "@/pages/forge/components/animation-list";
import type { Model3D } from "@/interfaces";

interface ModelCardProps {
  model: Model3D;
}

export function ModelCard({ model }: ModelCardProps) {
  return (
    <div className="bg-surface border border-border rounded-lg p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-mono">{model.id.slice(0, 8)}</span>
        <Badge status={model.status} />
      </div>
      {model.error && (
        <p className="text-xs text-red-400">{model.error}</p>
      )}
      {model.gcsPbrModelUrl && (
        <ModelViewer src={model.gcsPbrModelUrl} />
      )}
      {model.animations.length > 0 && (
        <AnimationList model3dId={model.id} animations={model.animations} />
      )}
    </div>
  );
}
