import archiver from "archiver";
import axios from "axios";
import type { Readable } from "stream";
import type { Response } from "express";
import type { DownloadZipRequest } from "./download.types";

const ALLOWED_HOSTS = [
  "storage.googleapis.com",
  "dashscope-463f.oss-ap-southeast-1.aliyuncs.com",
  "storage.cloud.google.com",
];

function isAllowedUrl(raw: string): boolean {
  try {
    const { hostname, protocol } = new URL(raw);
    return protocol === "https:" && ALLOWED_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

function sanitizeFolder(name: string): string {
  return name
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .replace(/\s+/g, " ")
    .trim() || "unnamed";
}

export async function streamDownloadZip(body: DownloadZipRequest, res: Response): Promise<void> {
  const archive = archiver("zip", { zlib: { level: 6 } });

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="figures-export.zip"');
  archive.pipe(res);

  for (const figure of body.selections) {
    const figureFolder = sanitizeFolder(figure.figureName);

    for (const skin of figure.skins) {
      const skinFolder = sanitizeFolder(skin.skinName);

      for (const variant of skin.variants) {
        const folder = `${figureFolder}/${skinFolder}/variant-${variant.variantLetter}`;

        for (const image of variant.images) {
          if (!isAllowedUrl(image.url)) continue;
          try {
            const { data } = await axios.get<Readable>(image.url, {
              responseType: "stream",
              timeout: 60_000,
            });
            archive.append(data, { name: `${folder}/${image.filename}` });
          } catch {
            // skip unavailable assets
          }
        }

        for (const model of variant.models) {
          if (!isAllowedUrl(model.url)) continue;
          try {
            const { data } = await axios.get<Readable>(model.url, {
              responseType: "stream",
              timeout: 120_000,
            });
            archive.append(data, { name: `${folder}/${model.filename}` });
          } catch {
            // skip unavailable assets
          }
        }
      }
    }
  }

  await archive.finalize();
}
