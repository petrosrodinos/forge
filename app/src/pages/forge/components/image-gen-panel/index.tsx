import { useState } from "react";
import { apiFetch, jsonInit } from "@/utils/apiClient";
import { useForgeStore } from "@/store/forgeStore";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Textarea } from "@/components/ui/Textarea";
import { IMAGE_MODELS } from "@/utils/constants";

interface GenerateImageResponse {
  imageUrl: string;
  skinImageId: string;
}

export function ImageGenPanel() {
  const { activeFigure, activeVariant } = useForgeStore();
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<string>(IMAGE_MODELS[0].id);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateImageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!activeVariant) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiFetch<GenerateImageResponse>("/api/images/generate", {
        method: "POST",
        ...jsonInit({
          variantId: activeVariant.id,
          figureId: activeFigure?.id,
          prompt,
          imageModel: model,
        }),
      });
      setResult(res);
      qc.invalidateQueries({ queryKey: ["figures"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {!activeVariant && (
        <p className="text-xs text-slate-400">Select a variant to generate images.</p>
      )}

      {activeVariant && (
        <>
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
            label="Prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Describe the image to generate…"
          />

          <Button onClick={handleGenerate} disabled={loading || !prompt.trim()}>
            {loading ? <Spinner className="w-3.5 h-3.5" /> : "Generate Image"}
          </Button>

          {error && <p className="text-xs text-red-400">{error}</p>}

          {result && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-green-400">Image generated and linked to variant</p>
              <img
                src={result.imageUrl}
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
