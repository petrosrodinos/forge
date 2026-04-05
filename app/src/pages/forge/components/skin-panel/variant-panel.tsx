import { useEffect, useState } from "react";
import { PromptEditor } from "@/pages/forge/components/prompt-editor";
import { ImageGrid } from "@/pages/forge/components/image-grid";
import { ImageUploader } from "@/pages/forge/components/image-uploader";
import { ModelCard } from "@/pages/forge/components/model-card";
import { Spinner } from "@/components/ui/Spinner";
import { useForgeStore } from "@/store/forgeStore";
import { usePipeline } from "@/features/pipeline/hooks/use-pipeline.hooks";
import { useUpdateVariant } from "@/features/skin-variants/hooks/use-skin-variants.hooks";
import { useDeleteSkinImage, useUploadSkinImage } from "@/features/skin-images/hooks/use-skin-images.hooks";
import { useQueryClient } from "@tanstack/react-query";
import type { SkinVariant, SkinImage } from "@/interfaces";

interface VariantPanelProps {
  variant: SkinVariant;
  figureId: string;
  figureType: string;
  figureName: string;
  skinName: string | null;
}

export function VariantPanel({ variant, figureId, figureType, figureName, skinName }: VariantPanelProps) {
  const qc = useQueryClient();
  const { selectedImage, setSelectedImage } = useForgeStore();
  const [name, setName] = useState(variant.name ?? "");
  const [activeImageId, setActiveImageId] = useState<string | null>(null);

  const updateVariant = useUpdateVariant();
  const deleteSkinImage = useDeleteSkinImage();
  const uploadSkinImage = useUploadSkinImage();

  const { run } = usePipeline(
    () => { setActiveImageId(null); qc.invalidateQueries({ queryKey: ["figures"] }); },
    () => { setActiveImageId(null); },
    () => { qc.invalidateQueries({ queryKey: ["figures"] }); },
  );

  useEffect(() => {
    setName(variant.name ?? "");
  }, [variant.id]);

  function handleNameBlur() {
    const trimmed = name.trim();
    const current = variant.name ?? "";
    if (trimmed === current) return;
    updateVariant.mutate({
      figureId,
      skinId: variant.skinId,
      variantId: variant.id,
      dto: { name: trimmed || null },
    });
  }

  function handleRunPipeline(image: SkinImage) {
    setSelectedImage(image);
    setActiveImageId(image.id);
    void run(variant.id, figureId, image.id, null);
  }

  function handleUploadFile(file: File) {
    uploadSkinImage.mutate({
      figureId,
      skinId: variant.skinId,
      variantId: variant.id,
      file,
    });
  }

  function handleDeleteImage(image: SkinImage) {
    if (deleteSkinImage.isPending) return;
    deleteSkinImage.mutate({
      figureId,
      skinId: variant.skinId,
      variantId: variant.id,
      imageId: image.id,
    });
  }

  const deletingImageId =
    deleteSkinImage.isPending && deleteSkinImage.variables?.imageId
      ? deleteSkinImage.variables.imageId
      : null;

  const activeModels =
    selectedImage?.id && variant.images.find((i) => i.id === selectedImage.id)
      ? variant.images.find((i) => i.id === selectedImage.id)!.models
      : [];

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto px-3 py-4 sm:px-4 sm:py-5">
      <section className="rounded-xl border border-border/80 bg-panel/50 p-4 ring-1 ring-white/5 shadow-sm shadow-black/10">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wider text-slate-500">Variant name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
            placeholder={`Variant ${variant.variant}`}
            disabled={updateVariant.isPending}
            className="w-full max-w-md border-b border-transparent bg-transparent py-1 text-sm font-semibold text-slate-100 placeholder:text-slate-600 transition-colors hover:border-border focus:border-accent/50 focus:outline-none"
          />
        </div>
      </section>

      <section className="rounded-xl border border-border/80 bg-panel/40 p-4 ring-1 ring-white/5">
        <div className="mb-3 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Image generation</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Describe the look you want and generate artwork for this variant. That image becomes the visual base when you build the 3D model below.
          </p>
        </div>
        <PromptEditor
          variant={variant}
          figureId={figureId}
          figureType={figureType}
          figureName={figureName}
          skinName={skinName}
        />
      </section>

      <section className="rounded-xl border border-border/80 bg-panel/40 p-4 ring-1 ring-white/5">
        <div className="mb-3 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Images</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your uploads and generated images for this variant. Click a card to select it, then use Run 3D to turn that picture into a mesh.
          </p>
          {uploadSkinImage.isPending ? (
            <div
              className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/10 px-3 py-2 text-xs text-accent-light/95"
              role="status"
              aria-live="polite"
            >
              <Spinner className="h-3.5 w-3.5" />
              <span>Uploading image…</span>
            </div>
          ) : null}
        </div>
        <ImageUploader
          onFile={handleUploadFile}
          disabled={uploadSkinImage.isPending}
          isUploading={uploadSkinImage.isPending}
        />
        <div className="mt-3">
          {variant.images.length > 0 ? (
            <ImageGrid
              images={variant.images}
              activeImageId={activeImageId}
              onRunPipeline={handleRunPipeline}
              onDelete={handleDeleteImage}
              deletingImageId={deletingImageId}
            />
          ) : (
            <p className="rounded-lg border border-dashed border-border/80 bg-surface/30 px-3 py-6 text-center text-xs text-slate-500">
              Upload or generate to add images to this variant.
            </p>
          )}
        </div>
      </section>

      {activeModels.length > 0 && (
        <section className="rounded-xl border border-border/80 bg-panel/40 p-4 ring-1 ring-white/5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">3D models</p>
          <div className="flex flex-col gap-3">
            {activeModels.map((m) => (
              <ModelCard key={m.id} model={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
