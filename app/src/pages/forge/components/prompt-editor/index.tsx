import { useEffect, useMemo, useState } from "react";
import { Pencil, Sparkles, X } from "lucide-react";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useGenerateAiPrompt, useUpdateVariant, useGenerateImage } from "@/features/skin-variants/hooks/use-skin-variants.hooks";
import { useImageModels } from "@/features/image-models/hooks/use-image-models.hooks";
import { ImageModelSelect } from "@/features/image-models/components/ImageModelSelect";
import { usePricingCosts } from "@/features/pricing/hooks/use-pricing.hooks";
import { PRICING_COST_KEYS } from "@/features/pricing/constants/pricing-cost-keys";
import { getFixedCostTokens } from "@/features/pricing/utils/pricing-costs.utils";
import { TokenCostPill } from "@/features/pricing/components/TokenCostPill";
import type { SkinVariant } from "@/interfaces";
import { fileToDataUrl } from "@/utils/imageFiles";
import { SketchToImageModal } from "@/pages/forge/components/sketch-to-image-modal";
import { useForgeStore } from "@/store/forgeStore";
import {
  imageUrlToDataUrl,
  isSelectableExistingImageUrl,
  SourceImageSelector,
  type ExistingImageOption,
  type SourceMode,
} from "@/pages/forge/components/source-image-selector";

interface PromptEditorProps {
  variant: SkinVariant;
  figureId: string;
  figureType: string;
  figureName?: string;
  skinName?: string | null;
  onImageGenerated?: () => void;
}

export function PromptEditor({
  variant,
  figureId,
  figureType,
  figureName,
  skinName,
  onImageGenerated,
}: PromptEditorProps) {
  const [prompt, setPrompt] = useState(variant.prompt ?? "");
  const [negPrompt, setNegPrompt] = useState(variant.negativePrompt ?? "");
  const [model, setModel] = useState(variant.imageModel ?? "");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceMode, setSourceMode] = useState<SourceMode>("upload");
  const [sourceSelectionError, setSourceSelectionError] = useState<string | null>(null);
  const [skinFilter, setSkinFilter] = useState<string>("all");
  const [variantFilter, setVariantFilter] = useState<string>("all");
  const [selectedExistingImageId, setSelectedExistingImageId] = useState<string>("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [sketchOpen, setSketchOpen] = useState(false);
  const { activeFigure } = useForgeStore();

  const { data: imageModels = [] } = useImageModels();
  const firstModelId = imageModels[0]?.id;
  const modelListKey = useMemo(() => imageModels.map((m) => m.id).join("|"), [imageModels]);

  const selectedModelMeta = useMemo(
    () => imageModels.find((m) => m.id === model),
    [imageModels, model],
  );
  const needsSourceImage = Boolean(selectedModelMeta?.isImageToImage);
  const allExistingImages = useMemo<ExistingImageOption[]>(() => {
    if (!activeFigure) return [];
    return activeFigure.skins.flatMap((skin) =>
      skin.variants.flatMap((v) =>
        v.images.map((img) => ({
          imageId: img.id,
          imageUrl: img.gcsUrl ?? img.sourceUrl,
          createdAt: img.createdAt,
          variantId: v.id,
          variantName: v.name ?? `Variant ${v.variant}`,
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
  const generateAiPrompt = useGenerateAiPrompt();
  const updateVariant = useUpdateVariant();
  const generateImage = useGenerateImage();
  const { data: pricingCosts } = usePricingCosts();
  const aiPromptTokenCost = getFixedCostTokens(pricingCosts, PRICING_COST_KEYS.AGENT_CHAT);

  /** Keep model in sync with variant + catalog without racing ImageModelSelect (parent effect must not clear after child sets default). */
  useEffect(() => {
    const saved = variant.imageModel?.trim() ?? "";
    if (imageModels.length === 0) {
      setModel(saved);
      return;
    }
    if (saved && imageModels.some((m) => m.id === saved)) {
      setModel(saved);
      return;
    }
    setModel(firstModelId ?? "");
  }, [variant.id, variant.imageModel, firstModelId, modelListKey]);

  useEffect(() => {
    setPrompt(variant.prompt ?? "");
    setNegPrompt(variant.negativePrompt ?? "");
    setAiOpen(false);
    setAiDescription("");
  }, [variant.id]);

  useEffect(() => {
    setSourceFile(null);
    setSourceMode("upload");
    setSkinFilter("all");
    setVariantFilter("all");
    setSelectedExistingImageId("");
    setSourceSelectionError(null);
  }, [variant.id]);

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

  function handleAiGenerate() {
    if (!aiDescription.trim()) return;
    const variantLabel = variant.name?.trim() || `Variant ${variant.variant}`;
    generateAiPrompt.mutate(
      {
        description: aiDescription.trim(),
        variant: variantLabel,
        context: {
          figureType,
          figureName,
          skinName: skinName?.trim() || undefined,
          existingModel: model || null,
          existingPrompt: prompt.trim() ? prompt : null,
          existingNegPrompt: negPrompt.trim() ? negPrompt : null,
        },
      },
      {
        onSuccess: (res) => {
          if (res.prompt) setPrompt(res.prompt);
          if (res.negativePrompt) setNegPrompt(res.negativePrompt);
          if (res.model) setModel(res.model);
          setAiOpen(false);
          setAiDescription("");
        },
      },
    );
  }

  function handleSave() {
    updateVariant.mutate({
      figureId,
      skinId: variant.skinId,
      variantId: variant.id,
      dto: { prompt, negativePrompt: negPrompt, imageModel: model },
    });
  }

  async function handleGenerateImage() {
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
    generateImage.mutate(
      {
        figureId,
        skinId: variant.skinId,
        variantCode: variant.variant,
        dto: {
          prompt,
          negativePrompt: negPrompt,
          model,
          ...(sourceImageDataUrl ? { sourceImageDataUrl } : {}),
        },
      },
      { onSuccess: () => onImageGenerated?.() },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor={`image-model-${variant.id}`} className="text-xs text-slate-400 font-medium">
          Model
        </label>
        <ImageModelSelect id={`image-model-${variant.id}`} value={model} onChange={setModel} />
      </div>

      {needsSourceImage ? (
        <>
          <SourceImageSelector
            pickerId={`source-image-${variant.id}`}
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

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setAiOpen((v) => !v)}
            className="gap-1.5"
          >
            <Sparkles size={12} />
            AI Prompt
            {aiPromptTokenCost != null ? <TokenCostPill tokens={aiPromptTokenCost} /> : null}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setSketchOpen(true)}
            disabled={generateImage.isPending}
            className="gap-1.5"
          >
            <Pencil size={12} />
            Sketch
          </Button>
        </div>
        {aiOpen && (
          <div className="flex flex-col gap-2 rounded-xl border border-accent/25 bg-accent/10 p-3 ring-1 ring-accent/15">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-300 font-medium">Describe what you want</span>
              <div className="flex items-center gap-2 shrink-0">
                {aiPromptTokenCost != null ? <TokenCostPill tokens={aiPromptTokenCost} /> : null}
                <button
                  type="button"
                  onClick={() => {
                    setAiOpen(false);
                    setAiDescription("");
                  }}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
            <textarea
              autoFocus
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAiGenerate();
              }}
              rows={3}
              placeholder={`e.g. "armored warrior with golden trim"`}
              className="w-full bg-surface border border-border rounded px-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent/50 resize-y"
            />
            <div className="flex flex-wrap gap-2 items-center">
              <Button size="sm" onClick={handleAiGenerate} disabled={generateAiPrompt.isPending || !aiDescription.trim()}>
                {generateAiPrompt.isPending ? <Spinner className="w-3 h-3" /> : <Sparkles size={12} />}
                {generateAiPrompt.isPending ? "Generating…" : "Generate"}
              </Button>
              <span className="text-[10px] text-slate-600">⌘↵ to submit</span>
            </div>
          </div>
        )}
      </div>

      <Textarea
        id={`prompt-${variant.id}`}
        label="Prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={5}
        autoResize
        placeholder='e.g. Stylized hero for a fantasy RPG: young knight in battered plate armor, blue cape, short brown hair, confident stance, full body front view, clean silhouette for 3D modeling, game-ready proportions'
      />

      <Textarea
        id={`negprompt-${variant.id}`}
        label="Negative prompt"
        value={negPrompt}
        onChange={(e) => setNegPrompt(e.target.value)}
        rows={3}
        autoResize
        placeholder="e.g. blurry, low poly, duplicate limbs, extra fingers, text, watermark, logo, cropped head, multiple characters, muddy textures, dark silhouette only"
      />

      <div className="flex gap-2 flex-wrap">
        <Button variant="secondary" size="sm" onClick={handleSave} disabled={updateVariant.isPending || !model.trim()}>
          {updateVariant.isPending ? <Spinner className="w-3 h-3" /> : "Save"}
        </Button>
        <Button
          size="sm"
          onClick={() => void handleGenerateImage()}
          disabled={
            generateImage.isPending ||
            !prompt.trim() ||
            !model.trim() ||
            (needsSourceImage && (sourceMode === "upload" ? !sourceFile : !selectedExistingImage))
          }
        >
          {generateImage.isPending ? <Spinner className="w-3 h-3" /> : "Generate Image"}
        </Button>
      </div>

      <SketchToImageModal
        open={sketchOpen}
        onClose={() => setSketchOpen(false)}
        variant={variant}
        figureId={figureId}
        figureType={figureType}
        onImageGenerated={onImageGenerated}
      />
    </div>
  );
}
