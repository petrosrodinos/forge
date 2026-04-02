import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import * as imagesSvc from "./skin-images.service";

const router = Router({ mergeParams: true });

router.get("/", async (req: Request<{ variantId: string }>, res: Response, next: NextFunction) => {
  try {
    res.json(await imagesSvc.listImages(req.params.variantId));
  } catch (err) { next(err); }
});

router.delete("/:imageId", async (req: Request<{ variantId: string; imageId: string }>, res: Response, next: NextFunction) => {
  try {
    res.json(await imagesSvc.deleteImage(req.params.imageId));
  } catch (err) { next(err); }
});

export default router;
