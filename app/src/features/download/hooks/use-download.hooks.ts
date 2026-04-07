import { useState } from "react";
import { downloadFiguresZip } from "@/features/download/services/download.services";
import type { DownloadZipRequest } from "@/features/download/interfaces/download.interfaces";

export function useDownloadZip() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download(request: DownloadZipRequest): Promise<void> {
    setDownloading(true);
    setError(null);
    try {
      await downloadFiguresZip(request);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  return { download, downloading, error };
}
