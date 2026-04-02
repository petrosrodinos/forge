import { Play } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { SkinImage } from "@/interfaces";

function bestModelStatus(models: SkinImage["models"]): string {
  if (models.length === 0) return "none";
  const order = ["success", "processing", "pending", "failed"];
  for (const s of order) {
    if (models.some((m) => m.status === s)) return s;
  }
  return models[0].status;
}

interface ImageCardProps {
  image: SkinImage;
  onRunPipeline: (image: SkinImage) => void;
  onSelect: (image: SkinImage) => void;
  selected?: boolean;
}

export function ImageCard({ image, onRunPipeline, onSelect, selected }: ImageCardProps) {
  const status = bestModelStatus(image.models);

  return (
    <div
      className={`rounded-lg overflow-hidden border cursor-pointer transition-colors ${
        selected ? "border-accent" : "border-border hover:border-slate-500"
      }`}
      onClick={() => onSelect(image)}
    >
      <img
        src={image.gcsUrl ?? image.sourceUrl}
        alt=""
        className="w-full aspect-square object-cover"
      />
      <div className="bg-panel p-2 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <Badge status={status} />
          <span className="text-[10px] text-slate-500">{image.models.length} models</span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onRunPipeline(image);
          }}
        >
          <Play size={10} />
          Run 3D
        </Button>
      </div>
    </div>
  );
}
