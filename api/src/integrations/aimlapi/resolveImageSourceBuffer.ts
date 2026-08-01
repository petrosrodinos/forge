import axios from "axios";

export type ResolvedImageSource = {
  buffer: Buffer;
  filename: string;
  contentType: string;
};

function extForMime(mime: string): string {
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  return "png";
}

export async function resolveImageSourceBuffer(source: string): Promise<ResolvedImageSource> {
  const trimmed = source.trim();
  const dataMatch = /^data:(image\/[^;]+);base64,(.+)$/is.exec(trimmed);
  if (dataMatch) {
    const contentType = dataMatch[1]!.toLowerCase();
    const buffer = Buffer.from(dataMatch[2]!.replace(/\s+/g, ""), "base64");
    return {
      buffer,
      filename: `image.${extForMime(contentType)}`,
      contentType,
    };
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error("Source image must be a data URL or http(s) URL");
  }

  const res = await axios.get<ArrayBuffer>(trimmed, {
    responseType: "arraybuffer",
    timeout: 60_000,
    maxContentLength: 50 * 1024 * 1024,
  });
  const headerType = String(res.headers["content-type"] ?? "").split(";")[0]!.trim().toLowerCase();
  const contentType = headerType.startsWith("image/") ? headerType : "image/png";
  return {
    buffer: Buffer.from(res.data),
    filename: `image.${extForMime(contentType)}`,
    contentType,
  };
}
