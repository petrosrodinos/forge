import { Router } from "express";
import multer from "multer";
import { sseHeaders } from "../../lib/sse";
import { runPipeline } from "./pipeline.service";
import { uploadBuffer } from "../../integrations/gcs/gcs.service";
import * as skinImageSvc from "../skin-images/skin-images.service";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// POST /api/pipeline
// Body (multipart): image, animations[], modelVersion, variantId, figureId
router.post("/", upload.single("image"), async (req, res, next) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "No image file provided" });

  const variantId = req.body.variantId as string | undefined;
  const figureId  = req.body.figureId  as string | undefined;

  if (!variantId || !figureId) {
    return res.status(400).json({ error: "variantId and figureId are required" });
  }

  const rawAnimations = req.body.animations as string | string[] | undefined;
  const animations    = Array.isArray(rawAnimations) ? rawAnimations
    : rawAnimations ? [rawAnimations] : ["preset:idle"];
  const modelVersion  = (req.body.modelVersion as string) ?? "v2.5-20250123";
  const mimeType: "image/png" | "image/jpeg" =
    file.mimetype === "image/jpeg" ? "image/jpeg" : "image/png";

  // Archive the uploaded image to GCS, then create the SkinImage record
  const ext      = mimeType === "image/jpeg" ? "jpg" : "png";
  const gcsKey   = `images/figures/${figureId}/${variantId}/${Date.now()}-source.${ext}`;
  const { gcsUrl } = await uploadBuffer(file.buffer, gcsKey, mimeType);
  const skinImage  = await skinImageSvc.createSkinImage(variantId, figureId, gcsUrl);

  sseHeaders(res);
  try {
    await runPipeline({
      imageId:      skinImage.id,
      figureId,
      imageBuffer:  file.buffer,
      filename:     file.originalname ?? `upload.${ext}`,
      mimeType,
      animations,
      modelVersion,
      res,
    });
  } catch (e) { next(e); } finally { res.end(); }
});

export default router;
