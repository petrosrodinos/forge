import { Router, type Request } from "express";
import { requireTokens } from "../../middleware/requireTokens";
import { sseHeaders, sseWrite } from "../../lib/sse";
import { animateTokenUsageIdempotencyKey, streamModel3dAnimations } from "./animate-stream";
import { runModel3dRig } from "./rig.service";
import { TRIPO_JOB_CONFIG } from "../tripo/tripo-job.config";
import * as models3dSvc from "./models3d.service";

const router = Router({ mergeParams: true });

function model3dIdParam(req: Request): string {
  const raw = req.params.model3dId;
  if (Array.isArray(raw)) return raw[0] ?? "";
  return typeof raw === "string" ? raw : "";
}

router.post(
  "/from-image/:imageId",
  requireTokens("trippoMesh", (req) => {
    const imageId = req.params.imageId;
    if (Array.isArray(imageId)) return imageId[0] ? `mesh:${imageId[0]}` : undefined;
    return typeof imageId === "string" && imageId ? `mesh:${imageId}` : undefined;
  }),
  async (req, res) => {
    try {
      const imageId = req.params.imageId;
      if (!imageId || Array.isArray(imageId)) {
        res.status(400).json({ error: "imageId is required" });
        return;
      }
      const model = await models3dSvc.createModel3DFromImage({ imageId, userId: req.userId });
      res.status(201).json(model);
    } catch (err) {
      const status = (err as Error & { status?: number }).status ?? 500;
      res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
    }
  },
);

router.post(
  "/from-images",
  (req, res, next) => {
    const imageIds = (req.body as { imageIds?: string[] }).imageIds;
    if (!Array.isArray(imageIds) || imageIds.length < 2 || imageIds.length > 4 || imageIds.some((id) => typeof id !== "string" || !id)) {
      return res.status(400).json({ error: "imageIds must be an array of 2 to 4 ids" });
    }
    next();
  },
  requireTokens("trippoMesh", (req) => {
    const imageIds = (req.body as { imageIds?: string[] }).imageIds;
    if (!Array.isArray(imageIds) || imageIds.length === 0) return undefined;
    return `mesh-multiview:${[...imageIds].sort().join(",")}`;
  }),
  async (req, res) => {
    try {
      const imageIds = (req.body as { imageIds: string[] }).imageIds;
      const model = await models3dSvc.createModel3DFromImages({ imageIds, userId: req.userId });
      res.status(201).json(model);
    } catch (err) {
      const status = (err as Error & { status?: number }).status ?? 500;
      res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
    }
  },
);

router.post(
  "/:model3dId/rig",
  requireTokens("rig", (req) => {
    const id = model3dIdParam(req);
    return id ? `rig:${id}` : undefined;
  }),
  async (req, res) => {
    const model3dId = model3dIdParam(req);
    if (!model3dId) {
      res.status(400).json({ error: "model3dId is required" });
      return;
    }
    sseHeaders(res);
    try {
      await runModel3dRig({
        model3dId,
        userId: req.userId,
        emitProgress: ({ step, status, data = {} }) => {
          sseWrite(res, TRIPO_JOB_CONFIG.TRIPO_SSE_EVENTS.PROGRESS, { step, status, ...data });
        },
        emitEvent: (event, data) => {
          sseWrite(res, event, data);
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[models3d/rig]", msg);
      sseWrite(res, TRIPO_JOB_CONFIG.TRIPO_SSE_EVENTS.ERROR, { message: msg });
    } finally {
      res.end();
    }
  },
);

router.post(
  "/:model3dId/animate",
  (req, res, next) => {
    const animations = (req.body as { animations?: string[] }).animations;
    if (!Array.isArray(animations) || animations.length === 0) {
      return res.status(400).json({ error: "animations array is required" });
    }
    next();
  },
  requireTokens("animationRetarget", (req) => {
    const id = model3dIdParam(req);
    const animations = (req.body as { animations?: string[] }).animations;
    if (!id || !Array.isArray(animations) || animations.length === 0) return undefined;
    return animateTokenUsageIdempotencyKey(id, animations);
  }),
  async (req, res) => {
    const animations = (req.body as { animations?: string[] }).animations ?? [];
    const model3dId = model3dIdParam(req);
    const idem = animateTokenUsageIdempotencyKey(model3dId, animations);
    await streamModel3dAnimations(req, res, model3dId, animations, idem);
  },
);

router.get("/:model3dId", async (req, res, next) => {
  try {
    const m = await models3dSvc.getModel3D(req.params.model3dId);
    if (!m) return res.status(404).json({ error: "Model not found" });
    res.json(m);
  } catch (err) {
    next(err);
  }
});

router.delete("/:model3dId", async (req, res, next) => {
  try {
    await models3dSvc.deleteModel3D(req.params.model3dId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
