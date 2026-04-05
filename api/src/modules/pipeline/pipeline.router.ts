import { Router } from "express";
import multer from "multer";
import { sseHeaders, sseWrite } from "../../lib/sse";
import { runPipeline } from "./pipeline.service";
import { streamAnimatePipeline } from "./animate-stream";
import { TRIPO_CONFIG } from "../tripo/config/tripo.config";
import { PIPELINE_CONFIG } from "./config/pipeline.config";
import { prisma } from "../../integrations/db/client";
import { debitForOperation, InsufficientTokensError } from "../tokens/tokens.service";
import { requireTokens } from "../../middleware/requireTokens";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// POST /api/pipeline/mesh
// Body (multipart): variantId, figureId; new raster via image file (creates skin image + mesh), or imageId only to mesh an existing stored image
router.post("/mesh", upload.single("image"), async (req, res, next) => {
  const variantId = req.body.variantId as string | undefined;
  const figureId = req.body.figureId as string | undefined;

  if (!variantId || !figureId) {
    return res.status(400).json({ error: "variantId and figureId are required" });
  }

  const figure = await prisma.figure.findFirst({ where: { id: figureId, userId: req.userId } });
  if (!figure) return res.status(404).json({ error: "Figure not found" });

  let imageBuffer: Buffer;
  let filename: string;
  let mimeType: "image/png" | "image/jpeg";
  let skinImageId: string | undefined;

  if (req.file) {
    imageBuffer = req.file.buffer;
    filename = req.file.originalname ?? "upload.png";
    mimeType = req.file.mimetype === "image/jpeg" ? "image/jpeg" : "image/png";
    const bodyImageId = req.body.imageId as string | undefined;
    if (bodyImageId) {
      return res.status(400).json({
        error: "Do not send imageId with a file here. Upload the file to POST .../variants/:variantId/images, then run mesh with imageId only.",
      });
    }
  } else {
    const imageId = req.body.imageId as string | undefined;
    if (!imageId) {
      return res.status(400).json({ error: "Provide an image file or an imageId" });
    }

    const skinImage = await prisma.skinImage.findUnique({ where: { id: imageId } });
    if (!skinImage) return res.status(404).json({ error: "Image not found" });

    const url = skinImage.gcsUrl ?? skinImage.sourceUrl;
    const fetchRes = await fetch(url);
    if (!fetchRes.ok) return res.status(502).json({ error: "Failed to fetch image from storage" });

    imageBuffer = Buffer.from(await fetchRes.arrayBuffer());
    const isJpeg = url.match(/\.jpe?g(\?|$)/i);
    mimeType = isJpeg ? "image/jpeg" : "image/png";
    filename = url.split("/").pop()?.split("?")[0] ?? `image.${mimeType === "image/jpeg" ? "jpg" : "png"}`;
    skinImageId = imageId;
  }

  const modelVersion = (req.body.modelVersion as string) ?? TRIPO_CONFIG.DEFAULT_TRIPO_MODEL_VERSION;

  try {
    await debitForOperation(req.userId, "pipeline");
  } catch (e) {
    if (e instanceof InsufficientTokensError) {
      return res.status(402).json({ error: e.message, required: e.required, balance: e.balance });
    }
    return next(e);
  }

  sseHeaders(res);
  try {
    await runPipeline({
      figureId,
      variantId,
      skinImageId,
      imageBuffer,
      filename,
      mimeType,
      modelVersion,
      emitProgress: ({ step, status, data = {} }) => {
        sseWrite(res, PIPELINE_CONFIG.PIPELINE_SSE_EVENTS.PROGRESS, { step, status, ...data });
      },
      emitEvent: (event, data) => {
        sseWrite(res, event, data);
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[pipeline/mesh]", msg);
    sseWrite(res, PIPELINE_CONFIG.PIPELINE_SSE_EVENTS.ERROR, { message: msg });
  } finally {
    res.end();
  }
});

// POST /api/pipeline/animate
// Body (JSON): { model3dId, animations[] }
router.post(
  "/animate",
  (req, res, next) => {
    const { model3dId, animations } = req.body as { model3dId?: string; animations?: string[] };
    if (!model3dId) return res.status(400).json({ error: "model3dId is required" });
    if (!Array.isArray(animations) || animations.length === 0) {
      return res.status(400).json({ error: "animations array is required" });
    }
    next();
  },
  requireTokens("animationRetarget"),
  async (req, res) => {
    const { model3dId, animations } = req.body as { model3dId: string; animations: string[] };
    await streamAnimatePipeline(req, res, model3dId, animations);
  },
);

export default router;
