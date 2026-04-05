import { useState } from "react";
import { Download, Maximize2, Play, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { OptionsMenu } from "@/components/ui/OptionsMenu";
import { downloadUrlAsFile, fileExtensionFromUrl } from "@/utils/helpers";
import type { SkinImage } from "@/interfaces";
import { usePricingCosts } from "@/features/pricing/hooks/use-pricing.hooks";
import { PRICING_COST_KEYS } from "@/features/pricing/constants/pricing-cost-keys";
import { getFixedCostTokens } from "@/features/pricing/utils/pricing-costs.utils";
import { TokenCostPill } from "@/features/pricing/components/TokenCostPill";

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

export function ImageCard({
  image,
  isRunning,
  onRunPipeline,
  onSelect,
  onDelete,
  selected,
}: ImageCardProps) {
  const status = bestModelStatus(image.models);
  const isProcessing = status === "processing";
  const { data: pricingCosts } = usePricingCosts();
  const pipelineTokenCost = getFixedCostTokens(pricingCosts, PRICING_COST_KEYS.FORGE_PIPELINE_MESH_RIG);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [expandOpen, setExpandOpen] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const previewSrc = image.gcsUrl ?? image.sourceUrl;

  const imageMenuItems = [
    {
      id: "extend",
      label: "Extend",
      icon: Maximize2,
      onSelect: () => setExpandOpen(true),
    },
    {
      id: "download",
      label: "Download",
      icon: Download,
      onSelect: () => {
        const ext = fileExtensionFromUrl(previewSrc) || ".png";
        void downloadUrlAsFile(previewSrc, `image-${image.id.slice(0, 8)}${ext}`);
      },
    },
    {
      id: "delete",
      label: "Delete",
      icon: Trash2,
      destructive: true,
      onSelect: () => setConfirmOpen(true),
    },
  ];

  return (
    <>
      <div className={`rounded-lg overflow-hidden border cursor-pointer transition-colors ${selected ? "border-accent" : "border-border hover:border-slate-500"}`} onClick={() => onSelect(image)}>
        <div className="relative w-full aspect-square bg-surface">
          {!imgLoaded && <Skeleton className="absolute inset-0 rounded-none" />}
          <img src={previewSrc} alt="" onLoad={() => setImgLoaded(true)} className={`w-full h-full object-cover transition-opacity duration-200 ${imgLoaded ? "opacity-100" : "opacity-0"}`} />
          <OptionsMenu className="absolute top-1.5 right-1.5 z-10" triggerVariant="secondary" triggerClassName="h-6 w-6 shadow-md bg-panel/95 backdrop-blur-sm border-border" menuLabel="Image options" items={imageMenuItems} />
        </div>

        <div className="bg-panel px-2 pt-1.5 pb-2 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {status !== "success" && <Badge status={status} />}
            <span className="text-[10px] text-slate-500 ml-auto">{image.models.length} models</span>
          </div>
          <div className="flex items-center justify-end gap-2">
            {pipelineTokenCost != null ? <TokenCostPill tokens={pipelineTokenCost} /> : null}
            <Button
              variant="secondary"
              size="sm"
              className="px-2 py-1 gap-1"
              disabled={isRunning || isProcessing}
              onClick={(e) => {
                e.stopPropagation();
                onRunPipeline(image);
              }}
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
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete(image);
        }}
        onCancel={() => setConfirmOpen(false)}
        danger
      />

      <Modal open={expandOpen} onClose={() => setExpandOpen(false)} title="Image preview">
        <img src={previewSrc} alt="" className="max-h-[min(85vh,900px)] w-full object-contain rounded-lg" />
      </Modal>
    </>
  );
}
