import { useState } from "react";
import { parseSSE } from "@/hooks/useSSE";
import type { RigCompletePayload } from "@/features/models3d/interfaces/model3d-jobs.interfaces";
import { notifyInsufficientTokensIf402 } from "@/store/insufficientTokensModalStore";
import { API_BASE_URL } from "@/utils/constants";

export function useModelRig(onComplete: (r: RigCompletePayload) => void) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(model3dId: string) {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/models3d/${encodeURIComponent(model3dId)}/rig`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        notifyInsufficientTokensIf402(res.status, errBody);
        const msg =
          typeof (errBody as { error?: unknown }).error === "string"
            ? (errBody as { error: string }).error
            : `Rig failed (${res.status})`;
        throw new Error(msg);
      }

      for await (const evt of parseSSE(res.body!)) {
        const data = JSON.parse(evt.data) as Record<string, unknown>;
        if (evt.event === "complete") {
          onComplete(data as unknown as RigCompletePayload);
          break;
        }
        if (evt.event === "error") throw new Error((data as { message?: string }).message ?? "Rig failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rig failed");
    } finally {
      setRunning(false);
    }
  }

  return { running, error, run };
}
