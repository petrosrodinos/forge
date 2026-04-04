import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { IMAGE_MODELS } from "@/utils/constants";
import { useGenerateAiPrompt, useUpdateVariant, useGenerateImage } from "@/features/skin-variants/hooks/use-skin-variants.hooks";
import type { SkinVariant } from "@/interfaces";

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
  const [model, setModel] = useState(variant.imageModel ?? IMAGE_MODELS[0].id);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiDescription, setAiDescription] = useState("");

  const generateAiPrompt = useGenerateAiPrompt();
  const updateVariant = useUpdateVariant();
  const generateImage = useGenerateImage();

  function handleAiGenerate() {
    if (!aiDescription.trim()) return;
    const variantLabel = variant.name?.trim() || `Variant ${variant.variant}`;
    generateAiPrompt.mutate(
      {
        description: aiDescription.trim(),
        variant: variantLabel,
        availableModels: IMAGE_MODELS.map((m) => ({ id: m.id, label: m.label })),
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
      variantCode: variant.variant,
      dto: { prompt, negativePrompt: negPrompt, imageModel: model },
    });
  }

  function handleGenerateImage() {
    generateImage.mutate(
      { figureId, skinId: variant.skinId, variantCode: variant.variant, dto: { prompt, negativePrompt: negPrompt, model } },
      { onSuccess: () => onImageGenerated?.() },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400 font-medium">Model</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="bg-panel border border-border rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-accent/50"
        >
          {IMAGE_MODELS.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>

      <Textarea
        id={`prompt-${variant.id}`}
        label="Prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={5}
        autoResize
        placeholder="Describe the character skin…"
      />

      <Textarea
        id={`negprompt-${variant.id}`}
        label="Negative prompt"
        value={negPrompt}
        onChange={(e) => setNegPrompt(e.target.value)}
        rows={3}
        autoResize
        placeholder="Exclude…"
      />

      {aiOpen && (
        <div className="flex flex-col gap-2 p-3 rounded border border-accent/30 bg-accent/5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium">Describe what you want</span>
            <button onClick={() => { setAiOpen(false); setAiDescription(""); }} className="text-slate-500 hover:text-slate-300 transition-colors">
              <X size={12} />
            </button>
          </div>
          <textarea
            autoFocus
            value={aiDescription}
            onChange={(e) => setAiDescription(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAiGenerate(); }}
            rows={3}
            placeholder={`e.g. "armored warrior with golden trim"`}
            className="w-full bg-surface border border-border rounded px-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent/50 resize-y"
          />
          <div className="flex gap-2 items-center">
            <Button size="sm" onClick={handleAiGenerate} disabled={generateAiPrompt.isPending || !aiDescription.trim()}>
              {generateAiPrompt.isPending ? <Spinner className="w-3 h-3" /> : <Sparkles size={12} />}
              {generateAiPrompt.isPending ? "Generating…" : "Generate"}
            </Button>
            <span className="text-[10px] text-slate-600">⌘↵ to submit</span>
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button variant="secondary" size="sm" onClick={() => setAiOpen((v) => !v)}>
          <Sparkles size={12} />
          AI Prompt
        </Button>
        <Button variant="secondary" size="sm" onClick={handleSave} disabled={updateVariant.isPending}>
          {updateVariant.isPending ? <Spinner className="w-3 h-3" /> : "Save"}
        </Button>
        <Button size="sm" onClick={handleGenerateImage} disabled={generateImage.isPending || !prompt.trim()}>
          {generateImage.isPending ? <Spinner className="w-3 h-3" /> : "Generate Image"}
        </Button>
      </div>
    </div>
  );
}
