"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
const promises_1 = require("fs/promises");
const TripoService_1 = require("../integrations/trippo/TripoService");
const uploadToken_1 = require("../integrations/trippo/uploadToken");
const fileHelpers_1 = require("../cli/fileHelpers");
function imageTypeFromPath(p) {
    const e = path_1.default.extname(p).toLowerCase();
    if (e === ".png")
        return "png";
    if (e === ".jpg" || e === ".jpeg")
        return "jpeg";
    throw new Error("Use .png, .jpg, or .jpeg");
}
function modelUrl(task) {
    return task.output.pbr_model ?? task.output.model ?? task.output.base_model;
}
async function downloadFile(url, outPath) {
    const abs = (0, fileHelpers_1.resolvePath)(outPath);
    await (0, promises_1.mkdir)(path_1.default.dirname(abs), { recursive: true });
    const res = await axios_1.default.get(url, { responseType: "arraybuffer" });
    await (0, promises_1.writeFile)(abs, Buffer.from(res.data));
    return abs;
}
const RIG_PLANS = [
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
    const tripo = new TripoService_1.TripoService();
    const { data: buf, absolutePath } = await (0, fileHelpers_1.readLocalFile)(imagePath);
    const imageName = path_1.default.parse(absolutePath).name;
    const generationDir = (0, fileHelpers_1.resolvePath)(path_1.default.join("output", imageName));
    await (0, promises_1.mkdir)(generationDir, { recursive: true });
    const storedImagePath = path_1.default.join(generationDir, path_1.default.basename(absolutePath));
    if ((0, fileHelpers_1.resolvePath)(absolutePath) !== (0, fileHelpers_1.resolvePath)(storedImagePath)) {
        await (0, promises_1.copyFile)(absolutePath, storedImagePath);
    }
    const outGlb = process.argv[3] ?? path_1.default.join(generationDir, `${imageName}-animated.glb`);
    const metaPath = process.argv[4] ?? path_1.default.join(generationDir, `${imageName}-tripo-meta.json`);
    const upload = await tripo.uploadFile(buf, path_1.default.basename(absolutePath), path_1.default.extname(absolutePath).toLowerCase() === ".png" ? "image/png" : "image/jpeg");
    const token = (0, uploadToken_1.extractTripoUploadToken)(upload);
    const imgType = imageTypeFromPath(absolutePath);
    const meshRes = await tripo.createTask({
        type: "image_to_model",
        file: { type: imgType, file_token: token },
        model_version: "v3.1-20260211",
        texture: true,
        pbr: true,
    });
    const meshId = meshRes.data.task_id;
    const meshTask = await tripo.pollTask(meshId, { intervalMs: 3000, timeoutMs: 900000 });
    const meshUrl = modelUrl(meshTask);
    if (!meshUrl)
        throw new Error("Mesh task succeeded but no model URL in output");
    const preRes = await tripo.createTask({
        type: "animate_prerigcheck",
        original_model_task_id: meshId,
    });
    const preTask = await tripo.pollTask(preRes.data.task_id, { intervalMs: 2000, timeoutMs: 300000 });
    if (!preTask.output.riggable)
        throw new Error("Model is not riggable according to prerigcheck");
    let rigId = "";
    let finalTask;
    let animations = [];
    let rigLabel = "";
    let retargetTaskId = "";
    let lastErr = "";
    for (const plan of RIG_PLANS) {
        const rigBody = { ...plan.rig, original_model_task_id: meshId };
        try {
            const rigRes = await tripo.createTask(rigBody);
            rigId = rigRes.data.task_id;
            await tripo.pollTask(rigId, { intervalMs: 3000, timeoutMs: 600000 });
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
            finalTask = await tripo.pollTask(retargetTaskId, { intervalMs: 3000, timeoutMs: 600000 });
            break;
        }
        catch (e) {
            lastErr = e instanceof Error ? e.message : String(e);
            console.error(JSON.stringify({ skippedRigPlan: plan.label, reason: lastErr }));
        }
    }
    if (!finalTask)
        throw new Error(`All rig/retarget attempts failed. Last: ${lastErr}`);
    const finalUrl = modelUrl(finalTask);
    if (!finalUrl)
        throw new Error("Retarget task succeeded but no model URL");
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
    await (0, promises_1.writeFile)((0, fileHelpers_1.resolvePath)(metaPath), JSON.stringify(meta, null, 2), "utf8");
    console.log(JSON.stringify({ ok: true, image: storedImagePath, animatedGlb: savedGlb, meta: metaPath, rigPlan: rigLabel }, null, 2));
}
main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
});
