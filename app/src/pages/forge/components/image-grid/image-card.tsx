import { useState } from "react";
import { Play, Trash2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ModelViewerModal } from "@/pages/forge/components/model-card/model-viewer-modal";
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
  isRunning: boolean;
  onRunPipeline: (image: SkinImage) => void;
  onSelect: (image: SkinImage) => void;
  onDelete: (image: SkinImage) => void;
  selected?: boolean;
}

export function ImageCard({ image, isRunning, onRunPipeline, onSelect, onDelete, selected }: ImageCardProps) {
  const status = bestModelStatus(image.models);
  const isProcessing = status === "processing";
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const readyModel = image.models.find((m) => m.status === "success" && m.gcsPbrModelUrl);

  return (
    <>
      <div
        className={`rounded-lg overflow-hidden border cursor-pointer transition-colors ${
          selected ? "border-accent" : "border-border hover:border-slate-500"
        }`}
        onClick={() => onSelect(image)}
      >
        <div className="relative w-full aspect-square bg-surface">
          {!imgLoaded && <Skeleton className="absolute inset-0 rounded-none" />}
          <img
            src={image.gcsUrl ?? image.sourceUrl}
            alt=""
            onLoad={() => setImgLoaded(true)}
            className={`w-full h-full object-cover transition-opacity duration-200 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          />
        </div>

        <div className="bg-panel px-2 py-2 flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5">
            <Badge status={status} />
            <span className="text-[10px] text-slate-500">{image.models.length} models</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 px-2 py-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10"
              disabled={isProcessing}
              onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }}
            >
              <Trash2 size={14} />
            </Button>
            {readyModel && (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 px-2 py-1.5 text-accent-light hover:bg-accent/10"
                onClick={(e) => { e.stopPropagation(); setViewerOpen(true); }}
              >
                <Eye size={12} />
                View
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0"
              disabled={isRunning || isProcessing}
              onClick={(e) => { e.stopPropagation(); onRunPipeline(image); }}
            >
              {isRunning ? <Spinner className="w-2.5 h-2.5" /> : <Play size={10} />}
              {isRunning ? "Running…" : "Run 3D"}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete image?"
        description="This will also delete all 3D models generated from this image."
        confirmLabel="Delete"
        onConfirm={() => { setConfirmOpen(false); onDelete(image); }}
        onCancel={() => setConfirmOpen(false)}
        danger
      />

      {viewerOpen && readyModel?.gcsPbrModelUrl && (
        <ModelViewerModal src={readyModel.gcsPbrModelUrl} onClose={() => setViewerOpen(false)} />
      )}
    </>
  );
}
