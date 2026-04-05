import { Router } from "express";
import { requireTokens } from "../../middleware/requireTokens";
import { animateTokenUsageIdempotencyKey, streamAnimatePipeline } from "../pipeline/animate-stream";
import * as models3dSvc from "./models3d.service";

const router = Router({ mergeParams: true });

router.post(
  "/:model3dId/animate",
  (req, res, next) => {
    const animations = (req.body as { animations?: string[] }).animations;
    if (!Array.isArray(animations) || animations.length === 0) {
      return res.status(400).json({ error: "animations array is required" });
    }
    next();
  },
  requireTokens("animationRetarget"),
  async (req, res) => {
    const animations = (req.body as { animations?: string[] }).animations ?? [];
    const model3dId = Array.isArray(req.params.model3dId) ? req.params.model3dId[0] : req.params.model3dId;
    const idem = animateTokenUsageIdempotencyKey(model3dId, animations);
    await streamAnimatePipeline(req, res, model3dId, animations, idem);
  },
);

router.get("/:model3dId", async (req, res, next) => {
  try {
    const m = await models3dSvc.getModel3D(req.params.model3dId);
    if (!m) return res.status(404).json({ error: "Model not found" });
    res.json(m);
  } catch (err) { next(err); }
});

router.delete("/:model3dId", async (req, res, next) => {
  try {
    await models3dSvc.deleteModel3D(req.params.model3dId);
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
