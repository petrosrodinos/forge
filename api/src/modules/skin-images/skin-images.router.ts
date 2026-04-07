import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { prisma } from "../../integrations/db/client";
import * as imagesSvc from "./skin-images.service";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router({ mergeParams: true });

router.get("/", async (req: Request<{ variantId: string }>, res: Response, next: NextFunction) => {
  try {
    res.json(await imagesSvc.listImages(req.params.variantId));
  } catch (err) { next(err); }
});

// POST multipart: image file; optional body imageId to replace that image’s raster (removes existing 3D).
router.post("/", upload.single("image"), async (
  req: Request<{ figureId: string; skinId: string; variantId: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { figureId, skinId, variantId } = req.params;
    const userId = req.userId!;

    const figure = await prisma.figure.findFirst({ where: { id: figureId, userId } });
    if (!figure) {
      res.status(404).json({ error: "Figure not found" });
      return;
    }

    const variant = await prisma.skinVariant.findFirst({
      where: { id: variantId, skinId, skin: { id: skinId, figureId } },
    });
    if (!variant) {
      res.status(404).json({ error: "Variant not found" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "Image file required" });
      return;
    }

    const mimeType = req.file.mimetype === "image/jpeg" ? "image/jpeg" : "image/png";
    const bodyImageId = req.body.imageId as string | undefined;

    let row: { id: string };
    if (bodyImageId) {
      row = await imagesSvc.replaceSkinImageSourceFromUpload({
        imageId: bodyImageId,
        variantId,
        figureId,
        buffer: req.file.buffer,
        mimeType,
      });
    } else {
      row = await imagesSvc.createSkinImageFromUpload(variantId, figureId, req.file.buffer, mimeType);
    }

    const withRelations = await prisma.skinImage.findUnique({
      where: { id: row.id },
      include: { models: { include: { animations: true } } },
    });
    res.status(201).json(withRelations);
  } catch (err) { next(err); }
});

router.delete("/:imageId", async (req: Request<{ variantId: string; imageId: string }>, res: Response, next: NextFunction) => {
  try {
    res.json(await imagesSvc.deleteImage(req.params.imageId));
  } catch (err) { next(err); }
});

export default router;
