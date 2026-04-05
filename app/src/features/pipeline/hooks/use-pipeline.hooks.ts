import { useState } from "react";
import { parseSSE } from "@/hooks/useSSE";
import type { PipelineResult } from "@/features/pipeline/interfaces/pipeline.interfaces";
import { notifyInsufficientTokensIf402 } from "@/store/insufficientTokensModalStore";
import { API_BASE_URL } from "@/utils/constants";

export function usePipeline(
  onComplete: (r: PipelineResult) => void,
  onError?: () => void,
  onModelCreated?: () => void,
) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(
    variantId: string,
    figureId: string,
    imageId: string,
    file: File | null,
  ) {
    setRunning(true);
    setError(null);
    let firstEvent = true;
    try {
      const form = new FormData();
      if (file) form.append("image", file);
      form.append("variantId", variantId);
      form.append("figureId", figureId);
      if (imageId) form.append("imageId", imageId);

      const res = await fetch(`${API_BASE_URL}/api/pipeline/mesh`, {
        method: "POST",
        credentials: "include",
        body: form,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        notifyInsufficientTokensIf402(res.status, errBody);
        const msg =
          typeof (errBody as { error?: unknown }).error === "string"
            ? (errBody as { error: string }).error
            : `Pipeline failed (${res.status})`;
        throw new Error(msg);
      }

      for await (const evt of parseSSE(res.body!)) {
        if (firstEvent) { firstEvent = false; onModelCreated?.(); }
        const data = JSON.parse(evt.data) as Record<string, unknown>;
        if (evt.event === "complete") {
          onComplete(data as unknown as PipelineResult);
          break;
        }
        if (evt.event === "error") throw new Error((data as { message?: string }).message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pipeline failed");
      onError?.();
    } finally {
      setRunning(false);
    }
  }

  return { running, error, run };
}
