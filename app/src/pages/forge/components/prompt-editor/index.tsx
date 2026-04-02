import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { IMAGE_MODELS } from "@/utils/constants";
import { generateAiVariant } from "@/features/figures/services/figures.services";
import { apiFetch, jsonInit } from "@/utils/apiClient";
import { useQueryClient } from "@tanstack/react-query";
import type { SkinVariant } from "@/interfaces";

interface PromptEditorProps {
  variant: SkinVariant;
  figureId: string;
}

export function PromptEditor({ variant, figureId }: PromptEditorProps) {
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState(variant.prompt ?? "");
  const [negPrompt, setNegPrompt] = useState(variant.negativePrompt ?? "");
  const [model, setModel] = useState(variant.imageModel ?? IMAGE_MODELS[0].id);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleAiGenerate() {
    setAiLoading(true);
    try {
      const res = await generateAiVariant({ figureId, prompt });
      setPrompt(res.prompt);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch(`/api/skins/variants/${variant.id}`, {
        method: "PUT",
        ...jsonInit({ prompt, negativePrompt: negPrompt, imageModel: model }),
      });
      qc.invalidateQueries({ queryKey: ["figures"] });
    } finally {
      setSaving(false);
    }
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
        rows={3}
        placeholder="Describe the character skin…"
      />

      <Textarea
        id={`negprompt-${variant.id}`}
        label="Negative prompt"
        value={negPrompt}
        onChange={(e) => setNegPrompt(e.target.value)}
        rows={2}
        placeholder="Exclude…"
      />

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={handleAiGenerate} disabled={aiLoading}>
          {aiLoading ? <Spinner className="w-3 h-3" /> : <Sparkles size={12} />}
          AI Prompt
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Spinner className="w-3 h-3" /> : "Save"}
        </Button>
      </div>
    </div>
  );
}
