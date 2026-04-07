import { API_BASE_URL } from "@/utils/constants";
import type { DownloadZipRequest } from "@/features/download/interfaces/download.interfaces";

export async function downloadFiguresZip(request: DownloadZipRequest): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/download/zip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || "Download failed");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "figures-export.zip";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
