import { useEffect, useRef, useState } from "react";
import { Download, Maximize2, Play, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { OptionsMenu } from "@/components/ui/OptionsMenu";
import { downloadUrlAsFile, fileExtensionFromUrl } from "@/utils/helpers";
import { cn } from "@/utils/cn";
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

/** URL the browser can load in `<img>` (excludes placeholders like `upload://local`). */
function rasterPreviewUrl(image: SkinImage): string | null {
  if (image.gcsUrl) return image.gcsUrl;
  const s = image.sourceUrl ?? "";
  if (/^https?:\/\//i.test(s) || s.startsWith("data:")) return s;
  return null;
}

export function canGenerateMeshOnImage(image: SkinImage): boolean {
  if (image.gcsUrl) return true;
  const s = image.sourceUrl ?? "";
  return /^https?:\/\//i.test(s) || s.startsWith("data:");
}

interface ImageCardProps {
  image: SkinImage;
  onSelect: (image: SkinImage) => void;
  onDelete: (image: SkinImage) => void;
  onGenerate3d?: (image: SkinImage) => void;
  meshPickOrder?: number | null;
  onToggleMeshPick?: (image: SkinImage) => void;
  meshPickBlocked?: boolean;
  selected?: boolean;
  /** True while this image’s delete request is in flight */
  deletePending?: boolean;
  /** True while this image is generating mesh */
  generatePending?: boolean;
}

export function ImageCard({
  image,
  onSelect,
  onDelete,
  onGenerate3d,
  meshPickOrder = null,
  onToggleMeshPick,
  meshPickBlocked = false,
  selected,
  deletePending = false,
  generatePending = false,
}: ImageCardProps) {
  const status = bestModelStatus(image.models);
  const { data: pricingCosts } = usePricingCosts();
  const meshTokenCost = getFixedCostTokens(pricingCosts, PRICING_COST_KEYS.TRIPPO_MESH_STANDALONE);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteStartedRef = useRef(false);

  useEffect(() => {
    if (deletePending) deleteStartedRef.current = true;
  }, [deletePending]);

  useEffect(() => {
    if (!deletePending && deleteStartedRef.current && confirmOpen) {
      setConfirmOpen(false);
      deleteStartedRef.current = false;
    }
  }, [deletePending, confirmOpen]);
  const [expandOpen, setExpandOpen] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const previewSrc = rasterPreviewUrl(image);
  const canGenerate = canGenerateMeshOnImage(image);

  useEffect(() => {
    setImgLoaded(false);
  }, [image.id, image.gcsUrl, image.sourceUrl]);

  const imageMenuItems = [
    {
      id: "extend",
      label: "Extend",
      icon: Maximize2,
      disabled: !previewSrc,
      onSelect: () => setExpandOpen(true),
    },
    {
      id: "download",
      label: "Download",
      icon: Download,
      disabled: !previewSrc,
      onSelect: () => {
        if (!previewSrc) return;
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
      <div
        className={cn(
          "cursor-pointer overflow-hidden rounded-xl border bg-panel/30 ring-1 ring-white/5 transition-all",
          selected ? "border-accent/50 ring-2 ring-accent/35 shadow-md shadow-accent/10" : "border-border/80 hover:border-accent/25 hover:ring-accent/10",
        )}
        onClick={() => onSelect(image)}
      >
        <div className="relative aspect-square w-full bg-surface/80">
          {onToggleMeshPick ? (
            <label
              title={meshPickBlocked ? "Maximum 4 images" : "Include in multiview mesh selection"}
              className={cn(
                "absolute left-1.5 top-1.5 z-20 flex h-7 min-w-7 items-center justify-center rounded-md border border-border/80 bg-panel/95 px-1 shadow-md ring-1 ring-white/10 backdrop-blur-sm",
                meshPickBlocked ? "cursor-not-allowed opacity-50" : "cursor-pointer",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={meshPickOrder != null}
                disabled={!canGenerate || meshPickBlocked}
                onChange={() => onToggleMeshPick(image)}
                onClick={(e) => e.stopPropagation()}
              />
              <span
                className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded text-[10px] font-semibold tabular-nums",
                  meshPickOrder != null ? "bg-accent/90 text-white" : "border border-border/80 bg-surface/80 text-slate-500",
                )}
              >
                {meshPickOrder != null ? meshPickOrder : ""}
              </span>
            </label>
          ) : null}
          {previewSrc ? (
            <>
              {!imgLoaded && <Skeleton className="absolute inset-0 z-[1] rounded-none" />}
              <img
                src={previewSrc}
                alt=""
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgLoaded(true)}
                className={`relative z-0 w-full h-full object-cover transition-opacity duration-200 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              />
            </>
          ) : (
            <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-1.5 px-3 text-center">
              <p className="text-xs font-medium text-amber-400/95">No image file</p>
              <p className="text-[10px] leading-snug text-slate-500">Upload did not finish or storage failed. Delete this card and try again.</p>
            </div>
          )}
          <OptionsMenu
            className="absolute top-1.5 right-1.5 z-10"
            triggerVariant="secondary"
            triggerClassName="h-6 w-6 shadow-md bg-panel/95 backdrop-blur-sm border-border"
            menuLabel="Image options"
            items={imageMenuItems}
          />
        </div>

        <div className="flex flex-col gap-1 border-t border-border/60 bg-panel/90 px-2.5 pt-2 pb-2.5">
          <div className="flex items-center gap-2">
            {status !== "success" && <Badge status={status} />}
            <span className="text-[10px] text-slate-500 ml-auto">{image.models.length} models</span>
          </div>
          {onGenerate3d ? (
            <div className="flex items-center justify-end gap-2">
              {meshTokenCost != null ? <TokenCostPill tokens={meshTokenCost} /> : null}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 gap-1 px-2 text-[11px]"
                disabled={!canGenerate || generatePending}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!canGenerate || generatePending) return;
                  onGenerate3d(image);
                }}
              >
                {generatePending ? <Spinner className="h-2.5 w-2.5" /> : <Play size={10} />}
                {generatePending ? "Generating..." : "Generate 3D"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete image?"
        description="This will also delete all 3D models generated from this image."
        confirmLabel="Delete"
        confirmLoading={deletePending}
        onConfirm={() => {
          if (deletePending) return;
          onDelete(image);
        }}
        onCancel={() => {
          deleteStartedRef.current = false;
          setConfirmOpen(false);
        }}
        danger
      />

      <Modal open={expandOpen} onClose={() => setExpandOpen(false)} title="Image preview">
        {previewSrc ? (
          <img src={previewSrc} alt="" className="max-h-[min(85vh,900px)] w-full object-contain rounded-lg" />
        ) : (
          <p className="text-sm text-slate-500 py-8 text-center">No preview available.</p>
        )}
      </Modal>
    </>
  );
}
