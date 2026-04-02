import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import * as variantsSvc from "./skin-variants.service";

const router = Router({ mergeParams: true });

router.get("/:variant", async (req: Request<{ skinId: string; variant: string }>, res: Response, next: NextFunction) => {
  try {
    const v = await variantsSvc.getVariant(req.params.skinId, req.params.variant);
    if (!v) return res.status(404).json({ error: "Variant not found" });
    res.json(v);
  } catch (err) { next(err); }
});

router.put("/:variant", async (req: Request<{ skinId: string; variant: string }>, res: Response, next: NextFunction) => {
  try {
    res.json(await variantsSvc.upsertVariant(req.params.skinId, { ...req.body, variant: req.params.variant }));
  } catch (err) { next(err); }
});

export default router;
