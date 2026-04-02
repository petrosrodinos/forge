import { useState } from "react";
import { parseSSE } from "@/hooks/useSSE";

export interface PipelineStep {
  step: string;
  status: string;
  [k: string]: unknown;
}

export interface PipelineResult {
  model3dId: string;
  gcsPbrModelUrl: string;
  gcsModelUrl: string;
  animations: Array<{ animationKey: string; gcsGlbUrl: string; status: string }>;
}

export function usePipeline(onComplete: (r: PipelineResult) => void) {
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(
    variantId: string,
    figureId: string,
    imageId: string,
    file: File | null,
    animations: string[],
  ) {
    setRunning(true);
    setSteps([]);
    setError(null);
    try {
      const form = new FormData();
      if (file) form.append("image", file);
      form.append("variantId", variantId);
      form.append("figureId", figureId);
      form.append("imageId", imageId);
      animations.forEach((a) => form.append("animations", a));

      const res = await fetch("/api/pipeline", {
        method: "POST",
        credentials: "include",
        body: form,
      });

      for await (const evt of parseSSE(res.body!)) {
        const data = JSON.parse(evt.data) as Record<string, unknown>;
        if (evt.event === "progress")
          setSteps((prev) => [...prev, data as PipelineStep]);
        if (evt.event === "complete") {
          onComplete(data as unknown as PipelineResult);
          break;
        }
        if (evt.event === "error") throw new Error((data as { message?: string }).message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pipeline failed");
    } finally {
      setRunning(false);
    }
  }

  return { steps, running, error, run };
}
