import { VariantPanel } from "@/pages/forge/components/skin-panel/variant-panel";
import type { Skin } from "@/interfaces";

interface SkinPanelProps {
  skin: Skin;
  figureId: string;
}

export function SkinPanel({ skin, figureId }: SkinPanelProps) {
  const variantA = skin.variants.find((v) => v.variant === "A");
  const variantB = skin.variants.find((v) => v.variant === "B");

  return (
    <div className="grid grid-cols-2 gap-0 h-full divide-x divide-border">
      {variantA ? (
        <VariantPanel variant={variantA} figureId={figureId} />
      ) : (
        <div className="flex items-center justify-center text-xs text-slate-500 p-4">
          No variant A
        </div>
      )}
      {variantB ? (
        <VariantPanel variant={variantB} figureId={figureId} />
      ) : (
        <div className="flex items-center justify-center text-xs text-slate-500 p-4">
          No variant B
        </div>
      )}
    </div>
  );
}
