import { ImageCard } from "@/pages/forge/components/image-grid/image-card";
import { useForgeStore } from "@/store/forgeStore";
import type { SkinImage } from "@/interfaces";

interface ImageGridProps {
  images: SkinImage[];
  onRunPipeline: (image: SkinImage) => void;
}

export function ImageGrid({ images, onRunPipeline }: ImageGridProps) {
  const { selectedImage, setSelectedImage } = useForgeStore();

  const sorted = [...images].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="grid grid-cols-2 gap-2">
      {sorted.map((img) => (
        <ImageCard
          key={img.id}
          image={img}
          onRunPipeline={onRunPipeline}
          onSelect={setSelectedImage}
          selected={selectedImage?.id === img.id}
        />
      ))}
    </div>
  );
}
