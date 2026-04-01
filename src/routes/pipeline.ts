import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { sseHeaders, sseWrite } from "../lib/sse";
import { getTripo } from "../services";
import { extractTripoUploadToken } from "../integrations/trippo/uploadToken";
import type { Response } from "express";

const upload = multer({ dest: path.join(process.cwd(), "uploads") });
const router = Router();

function emitStep(
  res: Response,
  step: string,
  status: string,
  data: Record<string, unknown> = {}
) {
  sseWrite(res, "progress", { step, status, ...data });
}

router.post("/", upload.single("image"), async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "No image file provided" });
    return;
  }

  sseHeaders(res);

  const cleanup = () => {
    try {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } catch { }
  };

  try {
    const tripo = getTripo();

    const rawAnimations = req.body.animations as string | string[] | undefined;
    const animations: string[] = Array.isArray(rawAnimations)
      ? rawAnimations
      : rawAnimations
        ? [rawAnimations]
        : ["preset:idle"];
    const modelVersion: string = (req.body.modelVersion as string | undefined) ?? "v2.5-20250123";
    const mimeType: "image/png" | "image/jpeg" =
      file.mimetype === "image/jpeg" ? "image/jpeg" : "image/png";

    // ── 1. Upload ────────────────────────────────────────────────────
    emitStep(res, "upload", "running");
    const buffer = fs.readFileSync(file.path);
    const uploadResult = await tripo.uploadFile(
      buffer,
      file.originalname || "upload.png",
      mimeType
    );
    const fileToken = extractTripoUploadToken(uploadResult);
    emitStep(res, "upload", "success", { fileToken });
    cleanup();

    // ── 2. Mesh generation ───────────────────────────────────────────
    emitStep(res, "mesh", "running");
    const meshTask = await tripo.createTask({
      type: "image_to_model",
      file: { type: mimeType === "image/jpeg" ? "jpeg" : "png", file_token: fileToken },
      model_version: modelVersion as never,
      texture: true,
      pbr: true,
    } as never);
    const meshTaskId = (meshTask.data as Record<string, unknown>).task_id as string;
    emitStep(res, "mesh", "queued", { taskId: meshTaskId });

    const meshResult = await tripo.pollTask(meshTaskId, { intervalMs: 2000 });
    const modelUrl = meshResult.output?.pbr_model ?? meshResult.output?.model;
    emitStep(res, "mesh", "success", { taskId: meshTaskId, modelUrl });

    // ── 3. Pre-rig check ─────────────────────────────────────────────
    emitStep(res, "prerig", "running");
    const prerigTask = await tripo.createTask({
      type: "animate_prerigcheck",
      original_model_task_id: meshTaskId,
    } as never);
    const prerigTaskId = (prerigTask.data as Record<string, unknown>).task_id as string;
    const prerigResult = await tripo.pollTask(prerigTaskId, { intervalMs: 2000 });
    const riggable = prerigResult.output?.riggable;

    if (!riggable) {
      emitStep(res, "prerig", "failed", { error: "Model is not riggable" });
      sseWrite(res, "complete", {
        error: "Model is not riggable — download static model instead.",
        modelUrl,
      });
      res.end();
      return;
    }
    emitStep(res, "prerig", "success", { riggable: true });

    // ── 4. Rig ───────────────────────────────────────────────────────
    emitStep(res, "rig", "running");
    const rigTask = await tripo.createTask({
      type: "animate_rig",
      original_model_task_id: meshTaskId,
      out_format: "glb",
    } as never);
    const rigTaskId = (rigTask.data as Record<string, unknown>).task_id as string;
    emitStep(res, "rig", "queued", { taskId: rigTaskId });
    await tripo.pollTask(rigTaskId, { intervalMs: 2000 });
    emitStep(res, "rig", "success", { taskId: rigTaskId });

    // ── 5. Animate ───────────────────────────────────────────────────
    emitStep(res, "animate", "running");
    const animTask = await tripo.createTask({
      type: "animate_retarget",
      original_model_task_id: rigTaskId,
      out_format: "glb",
      animations: animations as never,
      bake_animation: true,
      export_with_geometry: true,
    } as never);
    const animTaskId = (animTask.data as Record<string, unknown>).task_id as string;
    emitStep(res, "animate", "queued", { taskId: animTaskId });

    const animResult = await tripo.pollTask(animTaskId, {
      intervalMs: 2000,
      timeoutMs: 600_000,
    });
    const glbUrl = animResult.output?.model;
    emitStep(res, "animate", "success", { taskId: animTaskId, glbUrl });

    sseWrite(res, "complete", { glbUrl, modelUrl });
  } catch (err) {
    cleanup();
    sseWrite(res, "error", {
      message: err instanceof Error ? err.message : String(err),
    });
  } finally {
    sseWrite(res, "done", {});
    res.end();
  }
});

export default router;
