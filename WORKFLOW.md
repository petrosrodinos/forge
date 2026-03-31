# Image → 3D Model → Rig → Animation

Complete walkthrough using `TripoService` to go from a flat image to a fully animated 3D figure.

---

## Overview

```
uploadFile()
    │
    ▼
createTask (image_to_model)  ──►  pollTask()  ──►  3D model (task_id A)
    │
    ▼
createTask (animate_prerigcheck)  ──►  pollTask()  ──►  check output.riggable
    │
    ▼  (riggable === true)
createTask (animate_rig)  ──►  pollTask()  ──►  rigged model (task_id B)
    │
    ▼
createTask (animate_retarget)  ──►  pollTask()  ──►  animated .glb / .fbx
```

---

## Setup

```ts
import { TripoService } from "./src";
import * as fs from "fs";

const tripo = new TripoService(process.env.TRIPO_API_KEY!);
```

---

## Step 1 — Upload the image

Use `uploadFile()` to send a local image and receive a `file_token` that identifies it in subsequent tasks.

**Method signature**
```ts
uploadFile(
  file: Buffer | Readable,
  filename: string,
  mimeType: "image/png" | "image/jpeg"
): Promise<SuccessResponse>
```

**Code**
```ts
const imageBuffer = fs.readFileSync("./character.png");

const uploadResult = await tripo.uploadFile(
  imageBuffer,
  "character.png",
  "image/png"
);

// uploadResult.data contains the file_token
const fileToken = (uploadResult.data as { file_token: string }).file_token;
```

**What happens**
- `POST /upload` with `multipart/form-data`
- Returns `code: 0` on success and a `file_token` string inside `data`
- The token is valid for subsequent task requests — pass it as a `File` object

---

## Step 2 — Generate the 3D model from the image

Use `createTask()` with type `image_to_model`, then `pollTask()` to wait for completion.

**Request type used:** `ImageToModelRequest`

```ts
interface ImageToModelRequest extends BaseModelParams, TextureParams {
  type: "image_to_model";
  file: File;           // required — the uploaded image
  model_seed?: number;
  texture_seed?: number;
  style?: StyleOption;
  orientation?: "align_image" | "default";
  smart_low_poly?: boolean;
  generate_parts?: boolean;
}
```

**Code**
```ts
const modelTask = await tripo.createTask({
  type: "image_to_model",
  file: { type: "png", file_token: fileToken },
  texture: true,
  pbr: true,
  texture_quality: "detailed",
});

// modelTask.data.task_id is used to poll and as input to later tasks
const modelTaskId = modelTask.data.task_id;

const modelResult = await tripo.pollTask(modelTaskId);
// modelResult.output.model  → download URL for the base mesh
// modelResult.output.pbr_model → download URL for the PBR-textured mesh
```

**What happens**
- `POST /task` with `{ type: "image_to_model", ... }`
- Returns a `task_id` immediately (status starts as `queued`)
- `pollTask()` calls `GET /task/{task_id}` every 2 s until `status === "success"`
- Throws if status becomes `failed | cancelled | banned | expired`

> **Multiview alternative:** if you have front, back, and side images use `multiview_to_model` instead and pass an array to `files: File[]`.

---

## Step 3 — Pre-rig check

Before rigging, verify the model is riggable. This is a lightweight check — it does not modify the model.

**Request type used:** `AnimatePrerigcheckRequest`

```ts
interface AnimatePrerigcheckRequest {
  type: "animate_prerigcheck";
  original_model_task_id: string;   // task_id from Step 2
}
```

**Code**
```ts
const prerigTask = await tripo.createTask({
  type: "animate_prerigcheck",
  original_model_task_id: modelTaskId,
});

const prerigResult = await tripo.pollTask(prerigTask.data.task_id);

if (!prerigResult.output.riggable) {
  throw new Error("Model is not riggable — adjust geometry or use a different image.");
}
```

**What happens**
- `POST /task` with `{ type: "animate_prerigcheck", original_model_task_id }`
- On success, `output.riggable` is `true` or `false`
- Only proceed to Step 4 when `riggable === true`

---

## Step 4 — Rig the model

Apply an automatic skeleton rig to the model.

**Request type used:** `AnimateRigRequest`

```ts
interface AnimateRigRequest {
  type: "animate_rig";
  original_model_task_id: string;   // task_id from Step 2
  out_format?: "glb" | "fbx";       // default: "glb"
  topology?: "bip" | "quad";
  spec?: "mixamo" | "tripo";        // default: "tripo"
  model_version?: AnimateRigModelVersion; // "v2.0-20250506" | "v1.0-20240301"
}
```

**Code**
```ts
const rigTask = await tripo.createTask({
  type: "animate_rig",
  original_model_task_id: modelTaskId,
  out_format: "glb",
  spec: "tripo",
});

const rigResult = await tripo.pollTask(rigTask.data.task_id);

const riggedModelTaskId = rigTask.data.task_id;
// rigResult.output.model → download URL for the rigged mesh
```

**What happens**
- `POST /task` with `{ type: "animate_rig", original_model_task_id, ... }`
- Produces a fully rigged GLB/FBX with a skeleton bound to the mesh
- `riggedModelTaskId` is used as the source for retargeting in Step 5

---

## Step 5 — Apply animation (retarget)

Retarget a preset animation clip onto the rigged model.

**Request type used:** `AnimateRetargetRequest`

```ts
interface AnimateRetargetRequest {
  type: "animate_retarget";
  original_model_task_id: string;   // task_id from Step 4 (the rig task)
  out_format?: "glb" | "fbx";       // default: "glb"
  animation?: AnimationType;         // single clip
  animations?: AnimationType[];      // multiple clips (use one or the other)
  bake_animation?: boolean;          // default: true
  export_with_geometry?: boolean;    // default: true
}
```

Available `AnimationType` presets:
```
preset:idle      preset:walk      preset:run       preset:dive
preset:climb     preset:jump      preset:slash     preset:shoot
preset:hurt      preset:fall      preset:turn

preset:quadruped:walk   preset:hexapod:walk    preset:octopod:walk
preset:serpentine:march preset:aquatic:march
```

**Code — single animation**
```ts
const animTask = await tripo.createTask({
  type: "animate_retarget",
  original_model_task_id: riggedModelTaskId,
  animation: "preset:walk",
  out_format: "glb",
  bake_animation: true,
  export_with_geometry: true,
});

const animResult = await tripo.pollTask(animTask.data.task_id);
// animResult.output.model → download URL for the final animated .glb
```

**Code — multiple animations in one export**
```ts
const animTask = await tripo.createTask({
  type: "animate_retarget",
  original_model_task_id: riggedModelTaskId,
  animations: ["preset:idle", "preset:walk", "preset:run"],
  out_format: "glb",
});

const animResult = await tripo.pollTask(animTask.data.task_id);
```

> `animation` and `animations` are mutually exclusive — use exactly one.

---

## Full end-to-end example

```ts
import { TripoService } from "./src";
import * as fs from "fs";

async function imageToAnimatedModel(imagePath: string) {
  const tripo = new TripoService(process.env.TRIPO_API_KEY!);

  // 1. Upload
  const imageBuffer = fs.readFileSync(imagePath);
  const mimeType = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";
  const uploadResult = await tripo.uploadFile(imageBuffer, imagePath, mimeType);
  const fileToken = (uploadResult.data as { file_token: string }).file_token;

  // 2. Image → 3D model
  const modelTask = await tripo.createTask({
    type: "image_to_model",
    file: { type: "png", file_token: fileToken },
    texture: true,
    pbr: true,
  });
  const modelTaskId = modelTask.data.task_id;
  await tripo.pollTask(modelTaskId);
  console.log("Model ready:", modelTaskId);

  // 3. Pre-rig check
  const prerigTask = await tripo.createTask({
    type: "animate_prerigcheck",
    original_model_task_id: modelTaskId,
  });
  const prerigResult = await tripo.pollTask(prerigTask.data.task_id);
  if (!prerigResult.output.riggable) throw new Error("Model is not riggable");

  // 4. Rig
  const rigTask = await tripo.createTask({
    type: "animate_rig",
    original_model_task_id: modelTaskId,
    out_format: "glb",
    spec: "tripo",
  });
  const riggedTaskId = rigTask.data.task_id;
  await tripo.pollTask(riggedTaskId);
  console.log("Rig ready:", riggedTaskId);

  // 5. Animate
  const animTask = await tripo.createTask({
    type: "animate_retarget",
    original_model_task_id: riggedTaskId,
    animation: "preset:walk",
    out_format: "glb",
  });
  const animResult = await tripo.pollTask(animTask.data.task_id);
  console.log("Animated model URL:", animResult.output.model);

  return animResult.output.model;
}

imageToAnimatedModel("./character.png").catch(console.error);
```

---

## Task status reference

| Status | Meaning |
|---|---|
| `queued` | Waiting in the processing queue |
| `running` | Actively being processed |
| `success` | Completed — output URLs are available |
| `failed` | Processing error — check `error_msg` |
| `cancelled` | Manually cancelled |
| `banned` | Request violated usage policy |
| `expired` | Task result has expired |

`pollTask()` resolves on `success` and throws on `failed | cancelled | banned | expired`.

---

## Error handling

All API errors are thrown as `Error` with the format `[code] message — suggestion`.

```ts
try {
  const result = await tripo.pollTask(taskId);
} catch (err) {
  // err.message → "[1001] Task failed — check your input parameters"
  console.error(err);
}
```
