import { useEffect, useMemo, useState } from "react";
import { useForgeStore } from "@/store/forgeStore";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Textarea } from "@/components/ui/Textarea";
import { ImageModelSelect } from "@/features/image-models/components/ImageModelSelect";
import { useImageModels } from "@/features/image-models/hooks/use-image-models.hooks";
import { useGenerateImage } from "@/features/skin-variants/hooks/use-skin-variants.hooks";
import { fileToDataUrl } from "@/utils/imageFiles";
import {
  imageUrlToDataUrl,
  isSelectableExistingImageUrl,
  SourceImageSelector,
  type ExistingImageOption,
  type SourceMode,
} from "@/pages/forge/components/source-image-selector";

export function ImageGenPanel() {
  const { activeFigure, activeVariant } = useForgeStore();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceMode, setSourceMode] = useState<SourceMode>("upload");
  const [sourceSelectionError, setSourceSelectionError] = useState<string | null>(null);
  const [skinFilter, setSkinFilter] = useState<string>("all");
  const [variantFilter, setVariantFilter] = useState<string>("all");
  const [selectedExistingImageId, setSelectedExistingImageId] = useState<string>("");

  const { data: imageModels = [] } = useImageModels();
  const selectedModelMeta = useMemo(
    () => imageModels.find((m) => m.id === model),
    [imageModels, model],
  );
  const needsSourceImage = Boolean(selectedModelMeta?.isImageToImage);

  const generateImage = useGenerateImage();
  const allExistingImages = useMemo<ExistingImageOption[]>(() => {
    if (!activeFigure) return [];
    return activeFigure.skins.flatMap((skin) =>
      skin.variants.flatMap((variant) =>
        variant.images.map((image) => ({
          imageId: image.id,
          imageUrl: image.gcsUrl ?? image.sourceUrl,
          createdAt: image.createdAt,
          variantId: variant.id,
          variantName: variant.name ?? `Variant ${variant.variant}`,
          skinId: skin.id,
          skinName: skin.name ?? "Skin",
        })),
      ),
    ).filter((img) => isSelectableExistingImageUrl(img.imageUrl));
  }, [activeFigure]);
  const existingImageOptions = useMemo(() => {
    return allExistingImages
      .filter((img) => (skinFilter === "all" ? true : img.skinId === skinFilter))
      .filter((img) => (variantFilter === "all" ? true : img.variantId === variantFilter))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allExistingImages, skinFilter, variantFilter]);
  const selectedExistingImage = useMemo(
    () => existingImageOptions.find((img) => img.imageId === selectedExistingImageId) ?? null,
    [existingImageOptions, selectedExistingImageId],
  );
  const skinFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    allExistingImages.forEach((img) => {
      map.set(img.skinId, img.skinName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allExistingImages]);
  const variantFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    allExistingImages.forEach((img) => {
      if (skinFilter !== "all" && img.skinId !== skinFilter) return;
      map.set(img.variantId, img.variantName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allExistingImages, skinFilter]);
  const sourceIsValid = needsSourceImage
    ? sourceMode === "upload"
      ? Boolean(sourceFile)
      : Boolean(selectedExistingImage)
    : true;

  useEffect(() => {
    setSourceFile(null);
    setSelectedExistingImageId("");
    setSourceMode("upload");
    setSkinFilter("all");
    setVariantFilter("all");
    setSourceSelectionError(null);
  }, [activeVariant?.id]);

  useEffect(() => {
    if (!needsSourceImage) {
      setSourceFile(null);
      setSelectedExistingImageId("");
      setSourceMode("upload");
      setSourceSelectionError(null);
    }
  }, [needsSourceImage]);
  useEffect(() => {
    setVariantFilter("all");
    setSelectedExistingImageId("");
    setSourceSelectionError(null);
  }, [skinFilter]);
  useEffect(() => {
    setSourceSelectionError(null);
  }, [sourceMode, selectedExistingImageId, sourceFile]);

  async function handleGenerate() {
    if (!activeVariant || !activeFigure) return;
    setSourceSelectionError(null);
    let sourceImageDataUrl: string | undefined;
    try {
      if (needsSourceImage) {
        if (sourceMode === "upload" && sourceFile) {
          sourceImageDataUrl = await fileToDataUrl(sourceFile);
        }
        if (sourceMode === "existing" && selectedExistingImage) {
          sourceImageDataUrl = await imageUrlToDataUrl(selectedExistingImage.imageUrl);
        }
      }
    } catch {
      setSourceSelectionError("Selected source image cannot be read. Please pick a different image.");
      return;
    }
    generateImage.mutate({
      figureId: activeFigure.id,
      skinId: activeVariant.skinId,
      variantCode: activeVariant.variant,
      dto: {
        prompt,
        model,
        ...(sourceImageDataUrl ? { sourceImageDataUrl } : {}),
      },
    });
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {!activeVariant && (
        <p className="text-xs text-slate-400">Select a variant to generate images.</p>
      )}

      {activeVariant && (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor="image-gen-model" className="text-xs text-slate-400 font-medium">
              Model
            </label>
            <ImageModelSelect id="image-gen-model" value={model} onChange={setModel} />
          </div>

          {needsSourceImage ? (
            <>
              <SourceImageSelector
                pickerId="image-gen-source"
                sourceMode={sourceMode}
                onSourceModeChange={setSourceMode}
                sourceFile={sourceFile}
                onSourceFileChange={setSourceFile}
                skinFilter={skinFilter}
                onSkinFilterChange={setSkinFilter}
                variantFilter={variantFilter}
                onVariantFilterChange={setVariantFilter}
                skinFilterOptions={skinFilterOptions}
                variantFilterOptions={variantFilterOptions}
                existingImageOptions={existingImageOptions}
                selectedExistingImageId={selectedExistingImageId}
                onSelectedExistingImageIdChange={setSelectedExistingImageId}
                selectedExistingImage={selectedExistingImage}
                disabled={generateImage.isPending}
              />
              {sourceSelectionError ? <p className="text-xs text-red-400">{sourceSelectionError}</p> : null}
            </>
          ) : null}

          <Textarea
            label="Prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Describe the image to generate…"
          />

          <Button
            onClick={() => void handleGenerate()}
            disabled={
              generateImage.isPending ||
              !prompt.trim() ||
              !model.trim() ||
              !sourceIsValid
            }
          >
            {generateImage.isPending ? <Spinner className="w-3.5 h-3.5" /> : "Generate Image"}
          </Button>

          {generateImage.isError && (
            <p className="text-xs text-red-400">{(generateImage.error as Error).message}</p>
          )}

          {generateImage.isSuccess && generateImage.data && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-green-400">Image generated and linked to variant</p>
              <img
                src={generateImage.data.imageUrl}
                alt="Generated"
                className="w-full aspect-square object-cover rounded-lg border border-border"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
