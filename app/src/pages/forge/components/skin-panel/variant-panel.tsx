import { useState } from "react";
import { PromptEditor } from "@/pages/forge/components/prompt-editor";
import { ImageGrid } from "@/pages/forge/components/image-grid";
import { ImageUploader } from "@/pages/forge/components/image-uploader";
import { AnimationPicker } from "@/pages/forge/components/animation-list/animation-picker";
import { ModelCard } from "@/pages/forge/components/model-card";
import { useForgeStore } from "@/store/forgeStore";
import { usePipeline } from "@/features/pipeline/hooks/use-pipeline.hooks";
import { useQueryClient } from "@tanstack/react-query";
import type { SkinVariant, SkinImage } from "@/interfaces";

interface VariantPanelProps {
  variant: SkinVariant;
  figureId: string;
}

export function VariantPanel({ variant, figureId }: VariantPanelProps) {
  const qc = useQueryClient();
  const { selectedImage, setSelectedImage, setRightPanelTab } = useForgeStore();
  const [selectedAnimations, setSelectedAnimations] = useState<string[]>([]);
  const { run } = usePipeline(() => {
    qc.invalidateQueries({ queryKey: ["figures"] });
    setRightPanelTab("pipeline");
  });

  function handleRunPipeline(image: SkinImage) {
    setSelectedImage(image);
    setRightPanelTab("pipeline");
    void run(variant.id, figureId, image.id, null, selectedAnimations);
  }

  function handleUploadFile(file: File) {
    void run(variant.id, figureId, "", file, selectedAnimations);
    setRightPanelTab("pipeline");
  }

  const activeModels =
    selectedImage?.id && variant.images.find((i) => i.id === selectedImage.id)
      ? variant.images.find((i) => i.id === selectedImage.id)!.models
      : [];

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4 h-full">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-400 bg-panel border border-border rounded px-2 py-0.5">
          Variant {variant.variant}
        </span>
      </div>

      <PromptEditor variant={variant} figureId={figureId} />

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Animations
        </p>
        <AnimationPicker
          selected={selectedAnimations}
          onChange={setSelectedAnimations}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Images
        </p>
        <ImageUploader onFile={handleUploadFile} />
        <ImageGrid images={variant.images} onRunPipeline={handleRunPipeline} />
      </div>

      {activeModels.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Models
          </p>
          {activeModels.map((m) => (
            <ModelCard key={m.id} model={m} />
          ))}
        </div>
      )}
    </div>
  );
}
