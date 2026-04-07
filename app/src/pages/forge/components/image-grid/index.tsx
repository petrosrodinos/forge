import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ImageCard } from "@/pages/forge/components/image-grid/image-card";
import { useForgeStore } from "@/store/forgeStore";
import { cn } from "@/utils/cn";
import type { SkinImage } from "@/interfaces";

interface ImageGridProps {
  images: SkinImage[];
  onDelete: (image: SkinImage) => void;
  onGenerate3d?: (image: SkinImage) => void;
  meshPickIds?: string[];
  onToggleMeshPick?: (image: SkinImage) => void;
  /** When set, that image’s delete confirm shows loading */
  deletingImageId?: string | null;
  /** When set, that image’s generate action shows loading */
  generatingImageIds?: string[];
}

export function ImageGrid({
  images,
  onDelete,
  onGenerate3d,
  meshPickIds = [],
  onToggleMeshPick,
  deletingImageId = null,
  generatingImageIds = [],
}: ImageGridProps) {
  const { selectedImage, setSelectedImage } = useForgeStore();
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", dragFree: true });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateButtons = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    updateButtons();
    emblaApi.on("select", updateButtons);
    emblaApi.on("reInit", updateButtons);
  }, [emblaApi, updateButtons]);

  const sorted = [...images].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="group/carousel relative -mx-1 px-1">
      <div className="overflow-hidden rounded-lg" ref={emblaRef}>
        <div className="flex gap-2">
          {sorted.map((img) => (
            <div key={img.id} className="flex-none w-[47%] max-w-52">
              <ImageCard
                image={img}
                onSelect={setSelectedImage}
                onDelete={onDelete}
                onGenerate3d={onGenerate3d}
                meshPickOrder={meshPickIds.indexOf(img.id) >= 0 ? meshPickIds.indexOf(img.id) + 1 : null}
                onToggleMeshPick={onToggleMeshPick}
                meshPickBlocked={meshPickIds.length >= 4 && !meshPickIds.includes(img.id)}
                selected={selectedImage?.id === img.id}
                deletePending={deletingImageId === img.id}
                generatePending={generatingImageIds.includes(img.id)}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => emblaApi?.scrollPrev()}
        className={cn(
          "absolute left-0 top-1/2 z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full",
          "border border-border/80 bg-panel/95 text-slate-400 shadow-md shadow-black/20 ring-1 ring-white/5 transition-all",
          "hover:bg-surface hover:text-slate-200",
          !canScrollPrev && "pointer-events-none opacity-0",
        )}
        aria-label="Previous images"
      >
        <ChevronLeft size={12} />
      </button>

      <button
        type="button"
        onClick={() => emblaApi?.scrollNext()}
        className={cn(
          "absolute right-0 top-1/2 z-10 flex h-8 w-8 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full",
          "border border-border/80 bg-panel/95 text-slate-400 shadow-md shadow-black/20 ring-1 ring-white/5 transition-all",
          "hover:bg-surface hover:text-slate-200",
          !canScrollNext && "pointer-events-none opacity-0",
        )}
        aria-label="Next images"
      >
        <ChevronRight size={12} />
      </button>
    </div>
  );
}
