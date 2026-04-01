import { Router } from "express";
import axios from "axios";
import { getTripo } from "../services";
import { extractTripoUploadToken } from "../integrations/trippo/uploadToken";
import type { ModelVersion } from "../integrations/trippo/types";

const router = Router();

const DEFAULT_MODEL_VERSION = "v2.5-20250123";

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
