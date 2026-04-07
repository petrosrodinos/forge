import { useEffect, useState } from "react";
import { PromptEditor } from "@/pages/forge/components/prompt-editor";
import { ImageGrid } from "@/pages/forge/components/image-grid";
import { ImageUploader } from "@/pages/forge/components/image-uploader";
import { ModelCard } from "@/pages/forge/components/model-card";
import { Spinner } from "@/components/ui/Spinner";
import { useForgeStore } from "@/store/forgeStore";
import { useUpdateVariant } from "@/features/skin-variants/hooks/use-skin-variants.hooks";
import { useDeleteSkinImage, useUploadSkinImage } from "@/features/skin-images/hooks/use-skin-images.hooks";
import type { SkinVariant, SkinImage } from "@/interfaces";

interface VariantPanelProps {
  variant: SkinVariant;
  figureId: string;
  figureType: string;
  figureName: string;
  skinName: string | null;
}

export function VariantPanel({ variant, figureId, figureType, figureName, skinName }: VariantPanelProps) {
  const { selectedImage } = useForgeStore();
  const [name, setName] = useState(variant.name ?? "");

  const updateVariant = useUpdateVariant();
  const deleteSkinImage = useDeleteSkinImage();
  const uploadSkinImage = useUploadSkinImage();

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

  const deletingImageId = deleteSkinImage.isPending && deleteSkinImage.variables?.imageId ? deleteSkinImage.variables.imageId : null;

  const activeModels = selectedImage?.id && variant.images.find((i) => i.id === selectedImage.id) ? variant.images.find((i) => i.id === selectedImage.id)!.models : [];

  return (
    <div className="flex flex-col gap-0 overflow-y-auto h-full">
      <div className="flex flex-col gap-3 px-4 pt-4 pb-3 border-b border-border">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400 font-medium">Variant name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} onBlur={handleNameBlur} placeholder={`Variant ${variant.variant}`} disabled={updateVariant.isPending} className="text-sm font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-accent/50 focus:outline-none text-slate-200 placeholder-slate-500 py-0.5 transition-colors w-48" />
        </div>
      </div>

      <div className="px-4 py-4 border-b border-border">
        <PromptEditor variant={variant} figureId={figureId} figureType={figureType} figureName={figureName} skinName={skinName} />
      </div>

      <div className="flex flex-col gap-2 px-4 py-4 border-b border-border">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Images</p>
        <p className="text-xs text-slate-500 leading-relaxed">Upload or generate reference images for this variant. Select a card to view its 3D models below.</p>
        {uploadSkinImage.isPending ? (
          <div className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/10 px-3 py-2 text-xs text-accent-light/95" role="status" aria-live="polite">
            <Spinner className="h-3.5 w-3.5" />
            <span>Uploading image…</span>
          </div>
        ) : null}
        <ImageUploader onFile={handleUploadFile} disabled={uploadSkinImage.isPending} isUploading={uploadSkinImage.isPending} />
        {variant.images.length > 0 ? <ImageGrid images={variant.images} onDelete={handleDeleteImage} deletingImageId={deletingImageId} /> : <p className="text-xs text-slate-500">Upload to add images to this variant.</p>}
      </div>

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
