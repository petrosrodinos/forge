import { SingleImagePicker } from "@/components/SingleImagePicker";
import { cn } from "@/utils/cn";

export type SourceMode = "upload" | "existing";

export interface ExistingImageOption {
  imageId: string;
  imageUrl: string;
  createdAt: string;
  variantId: string;
  variantName: string;
  skinId: string;
  skinName: string;
}

export function isSelectableExistingImageUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith("data:");
}

interface SourceImageSelectorProps {
  pickerId: string;
  sourceMode: SourceMode;
  onSourceModeChange: (mode: SourceMode) => void;
  sourceFile: File | null;
  onSourceFileChange: (file: File | null) => void;
  skinFilter: string;
  onSkinFilterChange: (value: string) => void;
  variantFilter: string;
  onVariantFilterChange: (value: string) => void;
  skinFilterOptions: Array<{ id: string; name: string }>;
  variantFilterOptions: Array<{ id: string; name: string }>;
  existingImageOptions: ExistingImageOption[];
  selectedExistingImageId: string;
  onSelectedExistingImageIdChange: (id: string) => void;
  selectedExistingImage: ExistingImageOption | null;
  disabled?: boolean;
}

export async function imageUrlToDataUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("data:")) return imageUrl;
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error("Could not read selected source image.");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read selected source image."));
    };
    reader.onerror = () => reject(new Error("Could not read selected source image."));
    reader.readAsDataURL(blob);
  });
}

export function SourceImageSelector({
  pickerId,
  sourceMode,
  onSourceModeChange,
  sourceFile,
  onSourceFileChange,
  skinFilter,
  onSkinFilterChange,
  variantFilter,
  onVariantFilterChange,
  skinFilterOptions,
  variantFilterOptions,
  existingImageOptions,
  selectedExistingImageId,
  onSelectedExistingImageIdChange,
  selectedExistingImage,
  disabled = false,
}: SourceImageSelectorProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-panel/60 p-1">
        <button
          type="button"
          onClick={() => onSourceModeChange("upload")}
          className={cn(
            "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
            sourceMode === "upload"
              ? "bg-accent/20 text-accent-light"
              : "text-slate-400 hover:bg-surface hover:text-slate-200",
          )}
        >
          Upload source image
        </button>
        <button
          type="button"
          onClick={() => onSourceModeChange("existing")}
          className={cn(
            "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
            sourceMode === "existing"
              ? "bg-accent/20 text-accent-light"
              : "text-slate-400 hover:bg-surface hover:text-slate-200",
          )}
        >
          Choose existing image
        </button>
      </div>

      {sourceMode === "upload" ? (
        <SingleImagePicker id={pickerId} value={sourceFile} onChange={onSourceFileChange} disabled={disabled} />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={skinFilter}
              onChange={(e) => onSkinFilterChange(e.target.value)}
              disabled={disabled}
              className="h-9 rounded-md border border-border bg-panel px-2 text-xs text-slate-200"
            >
              <option value="all">All skins</option>
              {skinFilterOptions.map((skin) => (
                <option key={skin.id} value={skin.id}>
                  {skin.name}
                </option>
              ))}
            </select>
            <select
              value={variantFilter}
              onChange={(e) => onVariantFilterChange(e.target.value)}
              disabled={disabled}
              className="h-9 rounded-md border border-border bg-panel px-2 text-xs text-slate-200"
            >
              <option value="all">All variants</option>
              {variantFilterOptions.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name}
                </option>
              ))}
            </select>
          </div>
          {selectedExistingImage ? (
            <div className="flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-2 py-1.5">
              <img src={selectedExistingImage.imageUrl} alt="" className="h-8 w-8 rounded object-cover" />
              <p className="text-[11px] text-slate-300">Selected image will be used as source input.</p>
            </div>
          ) : null}

          {existingImageOptions.length === 0 ? (
            <p className="rounded-md border border-border/70 bg-surface/60 px-3 py-2 text-xs text-slate-400">
              No existing images match the selected filters.
            </p>
          ) : (
            <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
              {existingImageOptions.map((img) => (
                <button
                  key={img.imageId}
                  type="button"
                  onClick={() => onSelectedExistingImageIdChange(img.imageId)}
                  disabled={disabled}
                  className={cn(
                    "overflow-hidden rounded-md border bg-black/20 transition-colors",
                    selectedExistingImageId === img.imageId
                      ? "border-accent-light ring-1 ring-accent/40"
                      : "border-border hover:border-slate-500",
                  )}
                  title={`${img.skinName} / ${img.variantName}`}
                >
                  <img src={img.imageUrl} alt="" className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
