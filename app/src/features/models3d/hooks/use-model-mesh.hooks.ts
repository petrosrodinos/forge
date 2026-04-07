import { useState } from "react";
import { notifyInsufficientTokensIf402 } from "@/store/insufficientTokensModalStore";
import { API_BASE_URL } from "@/utils/constants";

export function useModelMesh(onComplete: () => void) {
  const [runningImageIds, setRunningImageIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function run(imageId: string) {
    setRunningImageIds([imageId]);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/models3d/from-image/${encodeURIComponent(imageId)}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        notifyInsufficientTokensIf402(res.status, errBody);
        const msg =
          typeof (errBody as { error?: unknown }).error === "string"
            ? (errBody as { error: string }).error
            : `Mesh generation failed (${res.status})`;
        throw new Error(msg);
      }
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mesh generation failed");
    } finally {
      setRunningImageIds([]);
    }
  }

  async function runMultiview(imageIds: string[]) {
    setRunningImageIds([...imageIds]);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/models3d/from-images`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        notifyInsufficientTokensIf402(res.status, errBody);
        const msg =
          typeof (errBody as { error?: unknown }).error === "string"
            ? (errBody as { error: string }).error
            : `Mesh generation failed (${res.status})`;
        throw new Error(msg);
      }
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mesh generation failed");
    } finally {
      setRunningImageIds([]);
    }
  }

  return { runningImageIds, error, run, runMultiview };
}
