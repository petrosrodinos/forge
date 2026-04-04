import { Badge } from "@/components/ui/Badge";
import { ModelViewer } from "@/pages/forge/components/model-card/model-viewer";
import type { PipelineStep, PipelineResult } from "@/features/pipeline/interfaces/pipeline.interfaces";

interface PipelineProgressProps {
  steps: PipelineStep[];
  running: boolean;
  result: PipelineResult | null;
  error: string | null;
}

export function PipelineProgress({ steps, running, result, error }: PipelineProgressProps) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {running && steps.length === 0 && (
        <p className="text-xs text-slate-400">Starting pipeline…</p>
      )}

      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-panel border border-border flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[9px] text-slate-400">{i + 1}</span>
          </div>
          <div className="flex flex-col gap-0.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-200">{step.step}</span>
              <Badge status={step.status} />
            </div>
            {typeof step.message === "string" && (
              <p className="text-[11px] text-slate-500">{step.message}</p>
            )}
          </div>
        </div>
      ))}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {result && (
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-xs text-green-400 font-medium">Pipeline complete!</p>
          {result.gcsPbrModelUrl && (
            <ModelViewer src={result.gcsPbrModelUrl} />
          )}
          {(result.animations ?? []).map((a) => (
            <div key={a.animationKey} className="flex items-center gap-2">
              <Badge status={a.status} />
              <span className="text-xs text-slate-400">{a.animationKey}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
