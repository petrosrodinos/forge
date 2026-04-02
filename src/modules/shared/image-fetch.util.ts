import axios from "axios";

export type SupportedImageMimeType = "image/png" | "image/jpeg";

export function detectImageMimeTypeFromBuffer(buf: Buffer): SupportedImageMimeType | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  return null;
}

export async function fetchImageAsBuffer(
  imageUrl: string,
  maxContentLength = 150 * 1024 * 1024
): Promise<{ buffer: Buffer; mimeType: SupportedImageMimeType }> {
  if (imageUrl.startsWith("data:")) {
    const m = imageUrl.match(/^data:(image\/(png|jpeg|jpg));base64,(.+)$/i);
    if (!m) throw new Error("Unsupported data URL - need image/png or image/jpeg base64");

    const mimeRaw = m[1].toLowerCase();
    const mimeType: SupportedImageMimeType =
      mimeRaw === "image/jpeg" || mimeRaw === "image/jpg" ? "image/jpeg" : "image/png";
    const buffer = Buffer.from(m[3], "base64");
    if (buffer.length === 0) throw new Error("Generated image buffer was empty");
    return { buffer, mimeType };
  }

  const res = await axios.get<ArrayBuffer>(imageUrl, {
    responseType: "arraybuffer",
    timeout: 120_000,
    maxContentLength,
    validateStatus: (s) => s >= 200 && s < 400,
  });

  const buffer = Buffer.from(res.data);
  const ct = String(res.headers["content-type"] ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  let mimeType: SupportedImageMimeType;
  if (ct === "image/jpeg" || ct === "image/jpg") mimeType = "image/jpeg";
  else if (ct === "image/png") mimeType = "image/png";
  else {
    const detected = detectImageMimeTypeFromBuffer(buffer);
    if (!detected) throw new Error("Could not detect image type (need PNG or JPEG)");
    mimeType = detected;
  }

  return { buffer, mimeType };
}

