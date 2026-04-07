import { useEffect, useRef, useState } from "react";
import { Download, Maximize2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { OptionsMenu } from "@/components/ui/OptionsMenu";
import { downloadUrlAsFile, fileExtensionFromUrl } from "@/utils/helpers";
import { cn } from "@/utils/cn";
import type { SkinImage } from "@/interfaces";

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

interface ImageCardProps {
  image: SkinImage;
  onSelect: (image: SkinImage) => void;
  onDelete: (image: SkinImage) => void;
  selected?: boolean;
  /** True while this image’s delete request is in flight */
  deletePending?: boolean;
}

export function ImageCard({ image, onSelect, onDelete, selected, deletePending = false }: ImageCardProps) {
  const status = bestModelStatus(image.models);
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
