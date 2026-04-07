import { Router } from "express";
import { z } from "zod";
import { streamDownloadZip } from "./download.service";

const router = Router();

const DownloadImageItemSchema = z.object({
  imageId: z.string().min(1),
  url: z.string().url(),
  filename: z.string().min(1),
});

const DownloadModelItemSchema = z.object({
  modelId: z.string().min(1),
  url: z.string().url(),
  filename: z.string().min(1),
});

const DownloadVariantSelectionSchema = z.object({
  variantId: z.string().min(1),
  variantLetter: z.string().min(1),
  images: z.array(DownloadImageItemSchema),
  models: z.array(DownloadModelItemSchema),
});

const DownloadSkinSelectionSchema = z.object({
  skinId: z.string().min(1),
  skinName: z.string().min(1),
  variants: z.array(DownloadVariantSelectionSchema),
});

const DownloadFigureSelectionSchema = z.object({
  figureId: z.string().min(1),
  figureName: z.string().min(1),
  skins: z.array(DownloadSkinSelectionSchema),
});

const DownloadZipRequestSchema = z.object({
  selections: z.array(DownloadFigureSelectionSchema).min(1),
});

router.post("/zip", async (req, res) => {
  const parsed = DownloadZipRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  try {
    await streamDownloadZip(parsed.data, res);
  } catch (e) {
    if (!res.headersSent) {
      res.status(500).json({ error: e instanceof Error ? e.message : "ZIP generation failed" });
    }
  }
});

export default router;
