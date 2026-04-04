import { Router } from "express";
import multer from "multer";
import { sseHeaders, sseWrite } from "../../lib/sse";
import { runPipeline } from "./pipeline.service";
import { runAnimations } from "./animate.service";
import { TRIPO_CONFIG } from "../tripo/config/tripo.config";
import { PIPELINE_CONFIG } from "./config/pipeline.config";
import { prisma } from "../../integrations/db/client";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// POST /api/pipeline/mesh
// Body (multipart): (image file OR imageId), variantId, figureId, modelVersion
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
  } catch (e) { next(e); } finally { res.end(); }
});

// POST /api/pipeline/animate
// Body (JSON): { model3dId, animations[] }
router.post("/animate", async (req, res, next) => {
  const { model3dId, animations } = req.body as { model3dId?: string; animations?: string[] };

  if (!model3dId) return res.status(400).json({ error: "model3dId is required" });
  if (!Array.isArray(animations) || animations.length === 0) {
    return res.status(400).json({ error: "animations array is required" });
  }

  const model = await prisma.model3D.findUnique({
    where: { id: model3dId },
    include: { image: { include: { variant: { include: { skin: true } } } } },
  });
  if (!model) return res.status(404).json({ error: "Model not found" });
  if (!model.rigTaskId) return res.status(400).json({ error: "Model has not been rigged yet" });

  // Verify ownership
  const figure = await prisma.figure.findFirst({
    where: { id: model.image.variant.skin.figureId, userId: req.userId },
  });
  if (!figure) return res.status(404).json({ error: "Figure not found" });

  sseHeaders(res);
  try {
    await runAnimations({
      model3dId,
      rigTaskId: model.rigTaskId,
      animations,
      emitProgress: ({ step, status, data = {} }) => {
        sseWrite(res, PIPELINE_CONFIG.PIPELINE_SSE_EVENTS.PROGRESS, { step, status, ...data });
      },
      emitEvent: (event, data) => {
        sseWrite(res, event, data);
      },
    });
  } catch (e) { next(e); } finally { res.end(); }
});

export default router;
