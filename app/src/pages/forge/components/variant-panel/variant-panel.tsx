import { useState } from "react";
import { Wand2, Upload } from "lucide-react";
import { PromptEditor } from "@/pages/forge/components/prompt-editor";
import { ImageGrid } from "@/pages/forge/components/image-grid";
import { ImageUploader } from "@/pages/forge/components/image-uploader";
import { ModelCard } from "@/pages/forge/components/model-card";
import { useForgeStore } from "@/store/forgeStore";
import { usePipeline } from "@/features/pipeline/hooks/use-pipeline.hooks";
import { useUpdateVariant } from "@/features/skin-variants/hooks/use-skin-variants.hooks";
import { useDeleteSkinImage } from "@/features/skin-images/hooks/use-skin-images.hooks";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/utils/cn";
import type { SkinVariant, SkinImage } from "@/interfaces";

interface VariantPanelProps {
  variant: SkinVariant;
  figureId: string;
}

type Section = "generate" | "upload";

export function VariantPanel({ variant, figureId }: VariantPanelProps) {
  const qc = useQueryClient();
  const { selectedImage, setSelectedImage } = useForgeStore();
  const [name, setName] = useState(variant.name ?? "");
  const [activeSection, setActiveSection] = useState<Section>("generate");
  const [activeImageId, setActiveImageId] = useState<string | null>(null);

  const updateVariant = useUpdateVariant();
  const deleteSkinImage = useDeleteSkinImage();

  const { running, error: pipelineError, run } = usePipeline(
    () => { setActiveImageId(null); qc.invalidateQueries({ queryKey: ["figures"] }); },
    () => { setActiveImageId(null); },
    () => { qc.invalidateQueries({ queryKey: ["figures"] }); },
  );

  function handleNameBlur() {
    const trimmed = name.trim();
    const current = variant.name ?? "";
    if (trimmed === current) return;
    updateVariant.mutate({
      figureId,
      skinId: variant.skinId,
      variantCode: variant.variant,
      dto: { name: trimmed || null },
    });
  }

  function handleRunPipeline(image: SkinImage) {
    setSelectedImage(image);
    setActiveImageId(image.id);
    void run(variant.id, figureId, image.id, null);
  }

  function handleUploadFile(file: File) {
    void run(variant.id, figureId, "", file);
  }

  function handleDeleteImage(image: SkinImage) {
    deleteSkinImage.mutate({
      figureId,
      skinId: variant.skinId,
      variantId: variant.id,
      imageId: image.id,
    });
  }

  const activeModels =
    selectedImage?.id && variant.images.find((i) => i.id === selectedImage.id)
      ? variant.images.find((i) => i.id === selectedImage.id)!.models
      : [];

  return (
    <div className="flex flex-col gap-0 overflow-y-auto h-full">
      <div className="flex flex-col gap-3 px-4 pt-4 pb-3 border-b border-border">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400 font-medium">Variant name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
            placeholder={`Variant ${variant.variant}`}
            disabled={updateVariant.isPending}
            className="text-sm font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-accent/50 focus:outline-none text-slate-200 placeholder-slate-500 py-0.5 transition-colors w-48"
          />
        </div>
      </div>

      <div className="flex border-b border-border shrink-0">
        <button
          onClick={() => setActiveSection("generate")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors",
            activeSection === "generate"
              ? "border-accent text-slate-100"
              : "border-transparent text-slate-400 hover:text-slate-200",
          )}
        >
          <Wand2 size={12} />
          Generate with AI
        </button>
        <button
          onClick={() => setActiveSection("upload")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors",
            activeSection === "upload"
              ? "border-accent text-slate-100"
              : "border-transparent text-slate-400 hover:text-slate-200",
          )}
        >
          <Upload size={12} />
          Upload Image
        </button>
      </div>

      <div className="px-4 py-4 border-b border-border">
        {activeSection === "generate" && (
          <PromptEditor variant={variant} figureId={figureId} />
        )}
        {activeSection === "upload" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-slate-400">
              Upload an image to use as the base for 3D generation. After uploading, the pipeline will start automatically.
            </p>
            <ImageUploader onFile={handleUploadFile} />
          </div>
        )}
      </div>

      {variant.images.length > 0 && (
        <div className="flex flex-col gap-2 px-4 py-4 border-b border-border">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Images</p>
          <ImageGrid
            images={variant.images}
            activeImageId={activeImageId}
            onRunPipeline={handleRunPipeline}
            onDelete={handleDeleteImage}
          />
        </div>
      )}

      {activeModels.length > 0 && (
        <div className="flex flex-col gap-2 px-4 py-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Models</p>
          {activeModels.map((m) => (
            <ModelCard key={m.id} model={m} />
          ))}
        </div>
      )}
    </div>
  );
}
