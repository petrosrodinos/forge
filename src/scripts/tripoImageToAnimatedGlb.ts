import "dotenv/config";
import axios from "axios";
import path from "path";
import { copyFile, mkdir, writeFile } from "fs/promises";
import { TripoService } from "../integrations/trippo/TripoService";
import { extractTripoUploadToken } from "../integrations/trippo/uploadToken";
import { readLocalFile, resolvePath } from "../cli/fileHelpers";
import type { AnimationType, CreateTaskRequest, Task } from "../integrations/trippo/types";

function imageTypeFromPath(p: string): "png" | "jpeg" {
  const e = path.extname(p).toLowerCase();
  if (e === ".png") return "png";
  if (e === ".jpg" || e === ".jpeg") return "jpeg";
  throw new Error("Use .png, .jpg, or .jpeg");
}

function modelUrl(task: Task): string | undefined {
  return task.output.pbr_model ?? task.output.model ?? task.output.base_model;
}

async function downloadFile(url: string, outPath: string): Promise<string> {
  const abs = resolvePath(outPath);
  await mkdir(path.dirname(abs), { recursive: true });
  const res = await axios.get<ArrayBuffer>(url, { responseType: "arraybuffer" });
  await writeFile(abs, Buffer.from(res.data));
  return abs;
}

type RigPlan = {
  label: string;
  rig: Extract<CreateTaskRequest, { type: "animate_rig" }>;
  animations: AnimationType[];
};

const RIG_PLANS: RigPlan[] = [
  {
    label: "quad_tripo",
    rig: {
      type: "animate_rig",
      original_model_task_id: "",
      out_format: "glb",
      topology: "quad",
      spec: "tripo",
    },
    animations: ["preset:idle", "preset:quadruped:walk"],
  },
  {
    label: "quad_mixamo",
    rig: {
      type: "animate_rig",
      original_model_task_id: "",
      out_format: "glb",
      topology: "quad",
      spec: "mixamo",
    },
    animations: ["preset:idle", "preset:quadruped:walk"],
  },
  {
    label: "bip_tripo",
    rig: {
      type: "animate_rig",
      original_model_task_id: "",
      out_format: "glb",
      topology: "bip",
      spec: "tripo",
    },
    animations: ["preset:idle", "preset:walk"],
  },
];

async function main() {
  const imagePath = process.argv[2] ?? "output/red-goth-pony.png";

  const tripo = new TripoService();
  const { data: buf, absolutePath } = await readLocalFile(imagePath);
  const imageName = path.parse(absolutePath).name;
  const generationDir = resolvePath(path.join("output", imageName));
  await mkdir(generationDir, { recursive: true });
  const storedImagePath = path.join(generationDir, path.basename(absolutePath));
  if (resolvePath(absolutePath) !== resolvePath(storedImagePath)) {
    await copyFile(absolutePath, storedImagePath);
  }
  const outGlb = process.argv[3] ?? path.join(generationDir, `${imageName}-animated.glb`);
  const metaPath = process.argv[4] ?? path.join(generationDir, `${imageName}-tripo-meta.json`);
  const upload = await tripo.uploadFile(buf, path.basename(absolutePath), path.extname(absolutePath).toLowerCase() === ".png" ? "image/png" : "image/jpeg");
  const token = extractTripoUploadToken(upload);
  const imgType = imageTypeFromPath(absolutePath);

  const meshRes = await tripo.createTask({
    type: "image_to_model",
    file: { type: imgType, file_token: token },
    model_version: "v3.1-20260211",
    texture: true,
    pbr: true,
  });
  const meshId = meshRes.data.task_id;
  const meshTask = await tripo.pollTask(meshId, { intervalMs: 3000, timeoutMs: 900_000 });
  const meshUrl = modelUrl(meshTask);
  if (!meshUrl) throw new Error("Mesh task succeeded but no model URL in output");

  const preRes = await tripo.createTask({
    type: "animate_prerigcheck",
    original_model_task_id: meshId,
  });
  const preTask = await tripo.pollTask(preRes.data.task_id, { intervalMs: 2000, timeoutMs: 300_000 });
  if (!preTask.output.riggable) throw new Error("Model is not riggable according to prerigcheck");

  let rigId = "";
  let finalTask: Task | undefined;
  let animations: AnimationType[] = [];
  let rigLabel = "";
  let retargetTaskId = "";
  let lastErr = "";

  for (const plan of RIG_PLANS) {
    const rigBody = { ...plan.rig, original_model_task_id: meshId };
    try {
      const rigRes = await tripo.createTask(rigBody);
      rigId = rigRes.data.task_id;
      await tripo.pollTask(rigId, { intervalMs: 3000, timeoutMs: 600_000 });
      animations = plan.animations;
      rigLabel = plan.label;
      const retRes = await tripo.createTask({
        type: "animate_retarget",
        original_model_task_id: rigId,
        out_format: "glb",
        animations,
        bake_animation: true,
        export_with_geometry: true,
      });
      retargetTaskId = retRes.data.task_id;
      finalTask = await tripo.pollTask(retargetTaskId, { intervalMs: 3000, timeoutMs: 600_000 });
      break;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      console.error(JSON.stringify({ skippedRigPlan: plan.label, reason: lastErr }));
    }
  }

  if (!finalTask) throw new Error(`All rig/retarget attempts failed. Last: ${lastErr}`);

  const finalUrl = modelUrl(finalTask);
  if (!finalUrl) throw new Error("Retarget task succeeded but no model URL");

  const savedGlb = await downloadFile(finalUrl, outGlb);
  const meta = {
    imagePath: storedImagePath,
    meshTaskId: meshId,
    meshModelUrl: meshUrl,
    prerigTaskId: preRes.data.task_id,
    rigPlan: rigLabel,
    rigTaskId: rigId,
    retargetTaskId,
    animatedGlbPath: savedGlb,
    animatedModelUrl: finalUrl,
    animations,
  };
  await writeFile(resolvePath(metaPath), JSON.stringify(meta, null, 2), "utf8");
  console.log(JSON.stringify({ ok: true, image: storedImagePath, animatedGlb: savedGlb, meta: metaPath, rigPlan: rigLabel }, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
