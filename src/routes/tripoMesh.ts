import { Router } from "express";
import axios from "axios";
import { getTripo } from "../services";
import { extractTripoUploadToken } from "../integrations/trippo/uploadToken";
import type { ModelVersion } from "../integrations/trippo/types";

const router = Router();

const DEFAULT_MODEL_VERSION = "v2.5-20250123";

const PROXY_MAX_BYTES = 150 * 1024 * 1024;

/** Only Tripo asset hosts — not an open proxy. */
function isAllowedTripoMeshHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h.endsWith(".tripo3d.com") || h.endsWith(".tripo3d.ai");
}

function parseAllowedModelUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (!isAllowedTripoMeshHost(u.hostname)) return null;
  return u;
}

/**
 * Same-origin fetch for GLB/GLTF (Tripo CDN blocks browser CORS).
 * POST JSON { url } so long signed URLs are not limited by query string length.
 */
router.post("/proxy-model", async (req, res) => {
  try {
    const url = req.body?.url;
    if (typeof url !== "string") {
      res.status(400).json({ error: "url is required" });
      return;
    }
    const target = parseAllowedModelUrl(url);
    if (!target) {
      res.status(403).json({ error: "url must be https and a Tripo asset host (*.tripo3d.com / *.tripo3d.ai)" });
      return;
    }

    const upstream = await axios.get<ArrayBuffer>(target.href, {
      responseType: "arraybuffer",
      timeout: 180_000,
      maxContentLength: PROXY_MAX_BYTES,
      validateStatus: (s) => s === 200,
    });

    const buf = Buffer.from(upstream.data);
    if (buf.length > PROXY_MAX_BYTES) {
      res.status(502).json({ error: "model exceeds size limit" });
      return;
    }

    let ct = String(upstream.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
    if (!ct || ct === "application/octet-stream" || ct === "binary/octet-stream") {
      ct = "model/gltf-binary";
    }
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(buf);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      res.status(404).json({ error: "Model not found" });
      return;
    }
    res.status(502).json({ error: msg || "proxy fetch failed" });
  }
});

router.get("/task/:id", async (req, res) => {
  try {
    res.json(await getTripo().getTask(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

async function fetchImageAsBuffer(
  imageUrl: string
): Promise<{ buffer: Buffer; mimeType: "image/png" | "image/jpeg" }> {
  if (imageUrl.startsWith("data:")) {
    const m = imageUrl.match(/^data:(image\/(png|jpeg|jpg));base64,(.+)$/i);
    if (!m) throw new Error("Unsupported data URL — use image/png or image/jpeg base64");
    const mimeRaw = m[1].toLowerCase();
    const mimeType: "image/png" | "image/jpeg" =
      mimeRaw === "image/jpeg" || mimeRaw === "image/jpg" ? "image/jpeg" : "image/png";
    return { buffer: Buffer.from(m[3], "base64"), mimeType };
  }

  const res = await axios.get<ArrayBuffer>(imageUrl, {
    responseType: "arraybuffer",
    timeout: 120_000,
    maxContentLength: 25 * 1024 * 1024,
    validateStatus: (s) => s >= 200 && s < 400,
  });

  const buffer = Buffer.from(res.data);
  const ct = String(res.headers["content-type"] ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  let mimeType: "image/png" | "image/jpeg";
  if (ct === "image/jpeg" || ct === "image/jpg") mimeType = "image/jpeg";
  else if (ct === "image/png") mimeType = "image/png";
  else if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) mimeType = "image/jpeg";
  else if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50) mimeType = "image/png";
  else throw new Error("Could not detect image type (need PNG or JPEG)");

  return { buffer, mimeType };
}

/**
 * Upload image and start Tripo image_to_model. Client polls GET /api/tripo/task/:id.
 */
router.post("/mesh-from-image-url", async (req, res) => {
  try {
    const imageUrl = req.body?.imageUrl;
    const modelVersion = (req.body?.modelVersion as ModelVersion | undefined) ?? DEFAULT_MODEL_VERSION;

    if (!imageUrl || typeof imageUrl !== "string") {
      res.status(400).json({ error: "imageUrl is required" });
      return;
    }

    const { buffer, mimeType } = await fetchImageAsBuffer(imageUrl.trim());
    const tripo = getTripo();
    const ext = mimeType === "image/jpeg" ? "jpeg" : "png";
    const filename = ext === "jpeg" ? "figure-source.jpg" : "figure-source.png";

    const upload = await tripo.uploadFile(buffer, filename, mimeType);
    const fileToken = extractTripoUploadToken(upload);

    const meshTask = await tripo.createTask({
      type: "image_to_model",
      file: { type: ext, file_token: fileToken },
      model_version: modelVersion,
      texture: true,
      pbr: true,
    } as never);

    const meshTaskId = (meshTask.data as Record<string, unknown>).task_id as string;
    if (!meshTaskId) throw new Error("Tripo did not return mesh task_id");

    res.json({ meshTaskId, modelVersion });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
