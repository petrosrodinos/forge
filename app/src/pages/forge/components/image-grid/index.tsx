import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ImageCard } from "@/pages/forge/components/image-grid/image-card";
import { useForgeStore } from "@/store/forgeStore";
import { cn } from "@/utils/cn";
import type { SkinImage } from "@/interfaces";

interface ImageGridProps {
  images: SkinImage[];
  activeImageId: string | null;
  onRunPipeline: (image: SkinImage) => void;
  onDelete: (image: SkinImage) => void;
}

export function ImageGrid({ images, activeImageId, onRunPipeline, onDelete }: ImageGridProps) {
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
    <div className="relative group/carousel">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-2">
          {sorted.map((img) => (
            <div key={img.id} className="flex-none w-[47%] max-w-52">
              <ImageCard
                image={img}
                isRunning={activeImageId === img.id}
                onRunPipeline={onRunPipeline}
                onSelect={setSelectedImage}
                onDelete={onDelete}
                selected={selectedImage?.id === img.id}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => emblaApi?.scrollPrev()}
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10",
          "w-6 h-6 rounded-full bg-panel border border-border flex items-center justify-center",
          "text-slate-400 hover:text-slate-200 hover:bg-surface transition-all",
          !canScrollPrev && "opacity-0 pointer-events-none",
        )}
      >
        <ChevronLeft size={12} />
      </button>

      <button
        onClick={() => emblaApi?.scrollNext()}
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10",
          "w-6 h-6 rounded-full bg-panel border border-border flex items-center justify-center",
          "text-slate-400 hover:text-slate-200 hover:bg-surface transition-all",
          !canScrollNext && "opacity-0 pointer-events-none",
        )}
      >
        <ChevronRight size={12} />
      </button>
    </div>
  );
}
