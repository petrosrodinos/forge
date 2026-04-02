import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import * as skinsSvc from "./skins.service";

const router = Router({ mergeParams: true });

router.get("/", async (req: Request<{ figureId: string }>, res: Response, next: NextFunction) => {
  try {
    res.json(await skinsSvc.listSkins(req.params.figureId));
  } catch (err) { next(err); }
});

router.post("/", async (req: Request<{ figureId: string }>, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await skinsSvc.createSkin(req.params.figureId, req.body));
  } catch (err) { next(err); }
});

router.post("/:skinId/set-base", async (req: Request<{ figureId: string; skinId: string }>, res: Response, next: NextFunction) => {
  try {
    res.json(await skinsSvc.setBaseSkin(req.params.figureId, req.params.skinId));
  } catch (err) { next(err); }
});

router.delete("/:skinId", async (req: Request<{ figureId: string; skinId: string }>, res: Response, next: NextFunction) => {
  try {
    res.json(await skinsSvc.deleteSkin(req.params.skinId));
  } catch (err) { next(err); }
});

export default router;
