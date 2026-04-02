import { Router } from "express";
import multer from "multer";
import { sseHeaders, sseWrite } from "../../lib/sse";
import { runPipeline } from "./pipeline.service";
import { DEFAULT_TRIPO_MODEL_VERSION } from "../../constants/tripoModels";
import { PIPELINE_DEFAULT_ANIMATIONS, PIPELINE_SSE_EVENTS } from "../../constants/pipeline";

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
    : rawAnimations ? [rawAnimations] : PIPELINE_DEFAULT_ANIMATIONS;
  const modelVersion  = (req.body.modelVersion as string) ?? DEFAULT_TRIPO_MODEL_VERSION;
  const mimeType: "image/png" | "image/jpeg" =
    file.mimetype === "image/jpeg" ? "image/jpeg" : "image/png";

  sseHeaders(res);
  try {
    await runPipeline({
      figureId,
      variantId,
      imageBuffer: file.buffer,
      filename:    file.originalname ?? `upload.${mimeType === "image/jpeg" ? "jpg" : "png"}`,
      mimeType,
      animations,
      modelVersion,
      emitProgress: ({ step, status, data = {} }) => {
        sseWrite(res, PIPELINE_SSE_EVENTS.PROGRESS, { step, status, ...data });
      },
      emitEvent: (event, data) => {
        sseWrite(res, event, data);
      },
    });
  } catch (e) { next(e); } finally { res.end(); }
});

export default router;
