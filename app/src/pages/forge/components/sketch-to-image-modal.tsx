import { useRef, useState, useEffect } from "react";
import { Eraser, Pencil, Redo2, Undo2, Trash2 } from "lucide-react";
import { ReactSketchCanvas, type ReactSketchCanvasRef } from "react-sketch-canvas";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Spinner } from "@/components/ui/Spinner";
import { useGenerateImage } from "@/features/skin-variants/hooks/use-skin-variants.hooks";
import type { SkinVariant } from "@/interfaces";
import { cn } from "@/utils/cn";

const CANVAS_PX = 512;
const BG = "#ffffff";

const COLORS = [
  { value: "#0f172a", label: "Black" },
  { value: "#475569", label: "Slate" },
  { value: "#94a3b8", label: "Light gray" },
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#22c55e", label: "Green" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
  { value: "#92400e", label: "Brown" },
];

const SIZES = [
  { value: 2, label: "Thin" },
  { value: 5, label: "Medium" },
  { value: 12, label: "Thick" },
];

type Tool = "draw" | "erase";

interface SketchToImageModalProps {
  open: boolean;
  onClose: () => void;
  variant: SkinVariant;
  figureId: string;
  figureType: string;
  onImageGenerated?: () => void;
}

export function SketchToImageModal({
  open,
  onClose,
  variant,
  figureId,
  figureType,
  onImageGenerated,
}: SketchToImageModalProps) {
  const sketchRef = useRef<ReactSketchCanvasRef>(null);
  const [tool, setTool] = useState<Tool>("draw");
  const [color, setColor] = useState(COLORS[0].value);
  const [strokeSize, setStrokeSize] = useState(SIZES[1].value);
  const [hint, setHint] = useState("");
  const generateImage = useGenerateImage();

  // Reset canvas when modal opens
  useEffect(() => {
    if (!open) return;
    sketchRef.current?.clearCanvas();
    sketchRef.current?.eraseMode(false);
    setTool("draw");
    setColor(COLORS[0].value);
    setStrokeSize(SIZES[1].value);
    setHint("");
  }, [open]);

  function selectTool(next: Tool) {
    setTool(next);
    sketchRef.current?.eraseMode(next === "erase");
  }

  async function handleGenerate() {
    if (!sketchRef.current) return;
    const dataUrl = await sketchRef.current.exportImage("png");
    generateImage.mutate(
      {
        figureId,
        skinId: variant.skinId,
        variantCode: variant.variant,
        dto: {
          fromSketch: true,
          figureType,
          sketchHint: hint.trim() || undefined,
          sourceImageDataUrl: dataUrl,
        },
      },
      {
        onSuccess: () => {
          onClose();
          onImageGenerated?.();
        },
      },
    );
  }

  const eraserWidth = Math.max(strokeSize * 3, 18);

  return (
    <Modal open={open} onClose={onClose} title="Sketch → 3D-ready image" contentClassName="items-stretch w-full">
      <div className="flex w-full max-w-lg flex-col gap-3">
        <p className="text-xs text-slate-500 leading-relaxed">
          Draw your idea below. We send it to the image model with a mesh-focused prompt (front view, clean background)
          and save the result to this variant like a normal generation.
        </p>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-surface/50 px-3 py-2.5 ring-1 ring-white/5">

          {/* Tool: draw / erase */}
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-panel/60 p-0.5">
            <button
              type="button"
              title="Draw"
              onClick={() => selectTool("draw")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                tool === "draw"
                  ? "bg-accent/20 text-accent-light ring-1 ring-accent/30"
                  : "text-slate-400 hover:bg-surface hover:text-slate-200",
              )}
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              title="Eraser"
              onClick={() => selectTool("erase")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                tool === "erase"
                  ? "bg-accent/20 text-accent-light ring-1 ring-accent/30"
                  : "text-slate-400 hover:bg-surface hover:text-slate-200",
              )}
            >
              <Eraser size={13} />
            </button>
          </div>

          <div className="h-5 w-px shrink-0 bg-border/60" />

          {/* Stroke size */}
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-panel/60 p-0.5">
            {SIZES.map((s) => (
              <button
                key={s.value}
                type="button"
                title={s.label}
                onClick={() => setStrokeSize(s.value)}
                className={cn(
                  "flex h-7 w-8 items-center justify-center rounded-md transition-colors",
                  strokeSize === s.value
                    ? "bg-accent/20 text-accent-light ring-1 ring-accent/30"
                    : "text-slate-400 hover:bg-surface hover:text-slate-200",
                )}
              >
                <span
                  className="rounded-full bg-current"
                  style={{ width: s.value + 4, height: s.value + 4 }}
                />
              </button>
            ))}
          </div>

          <div className="h-5 w-px shrink-0 bg-border/60" />

          {/* Undo / Redo / Clear */}
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-panel/60 p-0.5">
            <button
              type="button"
              title="Undo"
              onClick={() => sketchRef.current?.undo()}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-surface hover:text-slate-200"
            >
              <Undo2 size={13} />
            </button>
            <button
              type="button"
              title="Redo"
              onClick={() => sketchRef.current?.redo()}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-surface hover:text-slate-200"
            >
              <Redo2 size={13} />
            </button>
            <button
              type="button"
              title="Clear canvas"
              onClick={() => sketchRef.current?.clearCanvas()}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-surface hover:text-red-400"
            >
              <Trash2 size={13} />
            </button>
          </div>

          <div className="h-5 w-px shrink-0 bg-border/60" />

          {/* Color palette */}
          <div className="flex flex-wrap gap-1">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => {
                  setColor(c.value);
                  if (tool === "erase") selectTool("draw");
                }}
                className={cn(
                  "h-5 w-5 rounded-full border-2 transition-all",
                  color === c.value && tool === "draw"
                    ? "border-accent-light scale-110 shadow-sm"
                    : "border-transparent hover:scale-105 hover:border-slate-500",
                )}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="overflow-hidden rounded-xl border border-border/80 ring-1 ring-white/5">
          <ReactSketchCanvas
            ref={sketchRef}
            width={`${CANVAS_PX}px`}
            height={`${CANVAS_PX}px`}
            canvasColor={BG}
            strokeColor={color}
            strokeWidth={strokeSize}
            eraserWidth={eraserWidth}
            style={{
              width: "100%",
              maxHeight: "min(56vh, 420px)",
              aspectRatio: "1 / 1",
              cursor: tool === "erase" ? "cell" : "crosshair",
              display: "block",
              border: "none",
              borderRadius: 0,
            }}
          />
        </div>

        <Textarea
          id="sketch-hint"
          label="Optional notes"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          rows={2}
          placeholder='e.g. "add a cape", "robot with big shoulders"'
          className="text-xs"
        />

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={generateImage.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleGenerate()}
            disabled={generateImage.isPending}
            className="gap-1.5"
          >
            {generateImage.isPending ? <Spinner className="h-3.5 w-3.5" /> : <Pencil size={14} />}
            {generateImage.isPending ? "Generating…" : "Generate from sketch"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
