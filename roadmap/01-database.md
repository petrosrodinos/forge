# Phase 01 — Database + Storage Layer

**Goal:** Replace the deeply nested `figures.json` with MongoDB collections that mirror the real asset hierarchy: Figure → Skin → SkinVariant → SkinImage → Model3D → Animation. Archive every generated asset (AIML images, Tripo GLBs, animated GLBs) to Google Cloud Storage immediately — Tripo CDN URLs are signed and expire.

**Depends on:** Nothing (first phase).  
**Required before:** Phase 02 (Auth adds `userId` scoping).

---

## Real asset hierarchy (from figures.json)

```
Figure                         figures collection
  └── Skin                     skins collection         (name nullable = base skin)
        └── SkinVariant        skin_variants collection  (variant: "A" | "B")
              └── SkinImage    skin_images collection    (one per generation run)
                    └── Model3D    models_3d collection  (one per pipeline run)
                          └── Animation  animations collection  (one per animationKey)
```

---

## Target backend folder structure

```
src/
├── config/
│   ├── env.ts            # Zod-validated env — exits on missing vars
│   └── constants.ts
├── db/
│   └── client.ts         # Prisma singleton
├── integrations/
│   ├── gcs/
│   │   └── gcs.client.ts       # GCS Storage client singleton
│   ├── trippo/                 # (existing — keep)
│   └── aimlapi/                # (existing — keep)
├── modules/
│   ├── figures/
│   │   ├── figures.router.ts
│   │   ├── figures.service.ts
│   │   └── figures.types.ts
│   ├── skins/
│   │   ├── skins.router.ts
│   │   ├── skins.service.ts
│   │   └── skins.types.ts
│   ├── skin-variants/
│   │   ├── skin-variants.router.ts
│   │   ├── skin-variants.service.ts
│   │   └── skin-variants.types.ts
│   ├── skin-images/
│   │   ├── skin-images.router.ts
│   │   ├── skin-images.service.ts
│   │   └── skin-images.types.ts
│   ├── models3d/
│   │   ├── models3d.router.ts
│   │   ├── models3d.service.ts
│   │   └── models3d.types.ts
│   ├── animations/
│   │   ├── animations.router.ts
│   │   ├── animations.service.ts
│   │   └── animations.types.ts
│   └── pipeline/
│       ├── pipeline.router.ts   # POST /api/pipeline — SSE stream
│       └── pipeline.service.ts  # Orchestrates Tripo + DB writes + GCS uploads
├── middleware/
│   └── errorHandler.ts
└── server.ts
```

> **Rule:** No Prisma or GCS calls outside `*.service.ts` files. Routers call services only.

---

## Tasks

### 1. Install dependencies

```bash
npm install prisma @prisma/client zod @google-cloud/storage axios
npm install --save-dev prisma
npx prisma init --datasource-provider mongodb
```

---

### 2. Environment config

File: `src/config/env.ts`

```ts
import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

const schema = z.object({
  NODE_ENV:              z.enum(["development", "production", "test"]).default("development"),
  PORT:                  z.coerce.number().default(3000),
  DATABASE_URL:          z.string().min(1),
  AIML_API_KEY:          z.string().min(1),
  TRIPO_API_KEY:         z.string().min(1),
  AGENT_MODEL:           z.string().default("gpt-4o-mini"),
  GCS_BUCKET:            z.string().min(1),
  GCS_PROJECT_ID:        z.string().min(1),
  // Path to service account JSON key file, OR use Workload Identity in prod
  GCS_KEY_FILE:          z.string().optional(),
  // Public base URL for GCS assets (e.g. https://storage.googleapis.com/your-bucket)
  GCS_PUBLIC_BASE_URL:   z.string().url(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Missing env vars:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
```

`.env.example` additions:
```
DATABASE_URL=mongodb+srv://...
GCS_BUCKET=3d-figures-assets
GCS_PROJECT_ID=my-gcp-project
GCS_KEY_FILE=./gcs-key.json
GCS_PUBLIC_BASE_URL=https://storage.googleapis.com/3d-figures-assets
```

---

### 3. Prisma schema — full asset hierarchy

File: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

// ─── Figure ──────────────────────────────────────────────────────────────────

model Figure {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  name      String
  type      String   // "figure" | "obstacle"
  metadata  Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  skins     Skin[]

  @@index([name])
}

// ─── Skin ─────────────────────────────────────────────────────────────────────
// name is null for the base/default skin (maps to figure.default in JSON)

model Skin {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  figureId  String   @db.ObjectId
  figure    Figure   @relation(fields: [figureId], references: [id], onDelete: Cascade)
  name      String?  // null = base skin
  isBase    Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  variants  SkinVariant[]

  @@index([figureId])
}

// ─── SkinVariant ─────────────────────────────────────────────────────────────
// "A" = light/warm palette, "B" = dark/cool palette

model SkinVariant {
  id             String   @id @default(auto()) @map("_id") @db.ObjectId
  skinId         String   @db.ObjectId
  skin           Skin     @relation(fields: [skinId], references: [id], onDelete: Cascade)
  variant        String   // "A" | "B"
  prompt         String?
  negativePrompt String?
  imageModel     String?  // AIML model used for generation
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  images         SkinImage[]

  @@unique([skinId, variant])
  @@index([skinId])
}

// ─── SkinImage ────────────────────────────────────────────────────────────────
// One document per image generation run. Multiple images allowed per variant.

model SkinImage {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  variantId  String   @db.ObjectId
  variant    SkinVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)
  sourceUrl  String   // original AIML CDN URL
  gcsUrl     String?  // permanent GCS URL (archived immediately after generation)
  gcsBucket  String?
  gcsKey     String?  // path inside bucket, e.g. images/figures/<figureId>/<variantId>/<id>.jpg
  createdAt  DateTime @default(now())

  models     Model3D[]

  @@index([variantId])
}

// ─── Model3D ─────────────────────────────────────────────────────────────────
// One document per Tripo pipeline run against a SkinImage.

model Model3D {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  imageId      String   @db.ObjectId
  image        SkinImage @relation(fields: [imageId], references: [id], onDelete: Cascade)
  status       String   @default("pending") // "pending"|"processing"|"success"|"failed"
  error        String?

  // Tripo task IDs (for status queries / debugging)
  meshTaskId   String?
  prerigTaskId String?
  rigTaskId    String?

  // Original Tripo CDN URLs (SIGNED — EXPIRE after ~24h)
  pbrModelSourceUrl String?
  modelSourceUrl    String?

  // Permanent GCS URLs
  gcsPbrModelUrl    String?  // GLB with PBR textures
  gcsPbrModelKey    String?
  gcsModelUrl       String?  // plain GLB
  gcsModelKey       String?

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  animations Animation[]

  @@index([imageId])
  @@index([status])
}

// ─── Animation ───────────────────────────────────────────────────────────────
// One document per animationKey per Model3D.

model Animation {
  id             String   @id @default(auto()) @map("_id") @db.ObjectId
  model3dId      String   @db.ObjectId
  model3d        Model3D  @relation(fields: [model3dId], references: [id], onDelete: Cascade)
  animationKey   String   // "preset:idle", "preset:walk", "preset:shoot", etc.
  retargetTaskId String?

  // Original Tripo CDN URL (SIGNED — EXPIRES)
  glbSourceUrl   String?

  // Permanent GCS URL
  gcsGlbUrl      String?
  gcsGlbKey      String?

  status    String   @default("pending") // "pending"|"success"|"failed"
  error     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([model3dId, animationKey])
  @@index([model3dId])
}
```

Run: `npx prisma db push`

---

### 4. Database client

File: `src/db/client.ts`

```ts
import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";

const g = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = g.prisma ?? new PrismaClient({
  log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

if (env.NODE_ENV !== "production") g.prisma = prisma;
```

---

### 5. GCS client

File: `src/integrations/gcs/gcs.client.ts`

```ts
import { Storage } from "@google-cloud/storage";
import { env } from "../../config/env";

export const storage = new Storage({
  projectId: env.GCS_PROJECT_ID,
  keyFilename: env.GCS_KEY_FILE,   // undefined in prod → uses Application Default Credentials
});

export const bucket = storage.bucket(env.GCS_BUCKET);
```

---

### 6. GCS storage service

File: `src/integrations/gcs/gcs.service.ts`

Handles all upload/delete operations. Used by module services — never called directly from routers.

```ts
import axios from "axios";
import { bucket } from "./gcs.client";
import { env } from "../../config/env";

export interface UploadResult {
  gcsUrl:   string;
  gcsBucket:string;
  gcsKey:   string;
}

/**
 * Download a remote URL and upload it to GCS.
 * Returns the permanent public GCS URL.
 */
export async function archiveRemoteUrl(
  remoteUrl: string,
  gcsKey: string,        // e.g. "models3d/<model3dId>/pbr.glb"
  contentType: string,
): Promise<UploadResult> {
  const response = await axios.get<Buffer>(remoteUrl, { responseType: "arraybuffer" });
  const buffer   = Buffer.from(response.data);

  const file = bucket.file(gcsKey);
  await file.save(buffer, { contentType, resumable: false });
  await file.makePublic();

  return {
    gcsUrl:    `${env.GCS_PUBLIC_BASE_URL}/${gcsKey}`,
    gcsBucket: env.GCS_BUCKET,
    gcsKey,
  };
}

/**
 * Upload a buffer directly (e.g., from multer memory storage).
 */
export async function uploadBuffer(
  buffer: Buffer,
  gcsKey: string,
  contentType: string,
): Promise<UploadResult> {
  const file = bucket.file(gcsKey);
  await file.save(buffer, { contentType, resumable: false });
  await file.makePublic();

  return {
    gcsUrl:    `${env.GCS_PUBLIC_BASE_URL}/${gcsKey}`,
    gcsBucket: env.GCS_BUCKET,
    gcsKey,
  };
}

export async function deleteGcsFile(gcsKey: string): Promise<void> {
  await bucket.file(gcsKey).delete({ ignoreNotFound: true });
}
```

GCS key conventions (paths inside the bucket):

```
images/figures/<figureId>/<variantId>/<imageId>.<ext>
models3d/<model3dId>/pbr.glb
models3d/<model3dId>/model.glb
animations/<animationId>/<animationKey>.glb
```

---

### 7. Figures service

File: `src/modules/figures/figures.service.ts`

```ts
import { prisma } from "../../db/client";
import type { CreateFigureInput, UpdateFigureInput } from "./figures.types";

export async function listFigures() {
  return prisma.figure.findMany({
    include: {
      skins: {
        include: {
          variants: {
            include: {
              images: {
                orderBy: { createdAt: "desc" },
                include: {
                  models: {
                    include: { animations: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { isBase: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getFigureById(id: string) {
  return prisma.figure.findUnique({
    where: { id },
    include: {
      skins: {
        include: {
          variants: {
            include: {
              images: {
                include: { models: { include: { animations: true } } },
              },
            },
          },
        },
      },
    },
  });
}

export async function createFigure(input: CreateFigureInput) {
  return prisma.figure.create({
    data: { name: input.name, type: input.type, metadata: input.metadata },
  });
}

export async function updateFigure(id: string, input: UpdateFigureInput) {
  return prisma.figure.update({
    where: { id },
    data:  { name: input.name, type: input.type, metadata: input.metadata },
  });
}

export async function deleteFigure(id: string) {
  // Cascade handled by Prisma relations all the way down to Animation
  return prisma.figure.delete({ where: { id } });
}
```

---

### 8. Skins service

File: `src/modules/skins/skins.service.ts`

```ts
import { prisma } from "../../db/client";
import type { CreateSkinInput } from "./skins.types";

export async function listSkins(figureId: string) {
  return prisma.skin.findMany({
    where:   { figureId },
    include: { variants: { include: { images: { include: { models: { include: { animations: true } } } } } } },
    orderBy: [{ isBase: "desc" }, { createdAt: "asc" }],
  });
}

export async function createSkin(figureId: string, input: CreateSkinInput) {
  return prisma.skin.create({
    data: { figureId, name: input.name, isBase: input.isBase ?? false },
  });
}

export async function setBaseSkin(figureId: string, skinId: string) {
  await prisma.skin.updateMany({ where: { figureId }, data: { isBase: false } });
  return prisma.skin.update({ where: { id: skinId }, data: { isBase: true } });
}

export async function deleteSkin(id: string) {
  return prisma.skin.delete({ where: { id } });
}
```

---

### 9. SkinVariants service

File: `src/modules/skin-variants/skin-variants.service.ts`

```ts
import { prisma } from "../../db/client";
import type { UpsertVariantInput } from "./skin-variants.types";

/** Upsert variant A or B for a skin — one record per variant per skin */
export async function upsertVariant(skinId: string, input: UpsertVariantInput) {
  return prisma.skinVariant.upsert({
    where:  { skinId_variant: { skinId, variant: input.variant } },
    update: { prompt: input.prompt, negativePrompt: input.negativePrompt, imageModel: input.imageModel },
    create: { skinId, variant: input.variant, prompt: input.prompt, negativePrompt: input.negativePrompt, imageModel: input.imageModel },
    include: { images: { include: { models: { include: { animations: true } } } } },
  });
}

export async function getVariant(skinId: string, variant: string) {
  return prisma.skinVariant.findUnique({
    where:   { skinId_variant: { skinId, variant } },
    include: { images: { include: { models: { include: { animations: true } } } } },
  });
}
```

---

### 10. SkinImages service

File: `src/modules/skin-images/skin-images.service.ts`

Handles archiving AIML-generated images to GCS immediately on creation.

```ts
import { prisma } from "../../db/client";
import { archiveRemoteUrl } from "../../integrations/gcs/gcs.service";

export async function createSkinImage(
  variantId: string,
  figureId: string,
  sourceUrl: string,
) {
  // Create the DB record first to get the ID for the GCS key
  const image = await prisma.skinImage.create({
    data: { variantId, sourceUrl },
  });

  // Determine extension from URL
  const ext = sourceUrl.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)?.[1] ?? "jpg";
  const gcsKey = `images/figures/${figureId}/${variantId}/${image.id}.${ext}`;

  try {
    const { gcsUrl, gcsBucket } = await archiveRemoteUrl(sourceUrl, gcsKey, `image/${ext}`);
    return prisma.skinImage.update({
      where: { id: image.id },
      data:  { gcsUrl, gcsBucket, gcsKey },
    });
  } catch (err) {
    // GCS upload failed — keep record with sourceUrl only, log warning
    console.warn(`GCS upload failed for image ${image.id}:`, err);
    return image;
  }
}

export async function listImages(variantId: string) {
  return prisma.skinImage.findMany({
    where:   { variantId },
    include: { models: { include: { animations: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteImage(id: string) {
  // TODO Phase 01 task 16: delete GCS files on record deletion
  return prisma.skinImage.delete({ where: { id } });
}
```

---

### 11. Model3D service

File: `src/modules/models3d/models3d.service.ts`

```ts
import { prisma } from "../../db/client";
import { archiveRemoteUrl } from "../../integrations/gcs/gcs.service";

export async function createModel3D(imageId: string) {
  return prisma.model3D.create({ data: { imageId, status: "pending" } });
}

export async function updateModel3DProcessing(id: string, taskIds: {
  meshTaskId?: string; prerigTaskId?: string; rigTaskId?: string;
}) {
  return prisma.model3D.update({
    where: { id },
    data:  { status: "processing", ...taskIds },
  });
}

/** Called when Tripo mesh+rig pipeline completes — archives GLBs to GCS */
export async function finalizeModel3D(id: string, modelId: string, tripoUrls: {
  pbrModelSourceUrl: string;
  modelSourceUrl:    string;
}) {
  // Archive both GLBs to GCS
  const [pbr, plain] = await Promise.all([
    archiveRemoteUrl(tripoUrls.pbrModelSourceUrl, `models3d/${id}/pbr.glb`,   "model/gltf-binary"),
    archiveRemoteUrl(tripoUrls.modelSourceUrl,    `models3d/${id}/model.glb`, "model/gltf-binary"),
  ]);

  return prisma.model3D.update({
    where: { id },
    data:  {
      status:               "success",
      pbrModelSourceUrl:    tripoUrls.pbrModelSourceUrl,
      modelSourceUrl:       tripoUrls.modelSourceUrl,
      gcsPbrModelUrl:       pbr.gcsUrl,
      gcsPbrModelKey:       pbr.gcsKey,
      gcsModelUrl:          plain.gcsUrl,
      gcsModelKey:          plain.gcsKey,
    },
  });
}

export async function failModel3D(id: string, error: string) {
  return prisma.model3D.update({ where: { id }, data: { status: "failed", error } });
}

export async function getModel3D(id: string) {
  return prisma.model3D.findUnique({ where: { id }, include: { animations: true } });
}
```

---

### 12. Animations service

File: `src/modules/animations/animations.service.ts`

```ts
import { prisma } from "../../db/client";
import { archiveRemoteUrl } from "../../integrations/gcs/gcs.service";

export async function createAnimation(model3dId: string, animationKey: string) {
  return prisma.animation.create({
    data: { model3dId, animationKey, status: "pending" },
  });
}

/** Called when Tripo retarget task succeeds — archives animated GLB to GCS */
export async function finalizeAnimation(id: string, model3dId: string, animationKey: string, tripoGlbUrl: string) {
  const safeKey = animationKey.replace(/[^a-z0-9_:.-]/gi, "_");
  const gcsKey  = `animations/${model3dId}/${safeKey}_${id}.glb`;
  const { gcsUrl } = await archiveRemoteUrl(tripoGlbUrl, gcsKey, "model/gltf-binary");

  return prisma.animation.update({
    where: { id },
    data:  { status: "success", glbSourceUrl: tripoGlbUrl, gcsGlbUrl: gcsUrl, gcsGlbKey: gcsKey, retargetTaskId: id },
  });
}

export async function failAnimation(id: string, error: string) {
  return prisma.animation.update({ where: { id }, data: { status: "failed", error } });
}

export async function listAnimations(model3dId: string) {
  return prisma.animation.findMany({ where: { model3dId }, orderBy: { createdAt: "asc" } });
}
```

---

### 13. Pipeline service (refactored)

File: `src/modules/pipeline/pipeline.service.ts`

Replaces `src/routes/pipeline.ts`. Orchestrates Tripo tasks AND writes to the database AND archives assets to GCS. Every step persists its result before continuing.

```ts
import fs from "fs";
import type { Response } from "express";
import { getTripo } from "../../services";
import { sseWrite } from "../../lib/sse";
import { extractTripoUploadToken } from "../../integrations/trippo/uploadToken";
import { uploadBuffer } from "../../integrations/gcs/gcs.service";
import * as model3dSvc    from "../models3d/models3d.service";
import * as animationSvc  from "../animations/animations.service";

interface RunPipelineOpts {
  imageId:      string;   // SkinImage document ID
  figureId:     string;
  imageBuffer:  Buffer;
  filename:     string;
  mimeType:     "image/png" | "image/jpeg";
  animations:   string[];
  modelVersion: string;
  res:          Response; // SSE response
}

function emit(res: Response, step: string, status: string, data: Record<string, unknown> = {}) {
  sseWrite(res, "progress", { step, status, ...data });
}

export async function runPipeline(opts: RunPipelineOpts) {
  const { imageId, figureId, imageBuffer, filename, mimeType, animations, modelVersion, res } = opts;
  const tripo = getTripo();

  // Create Model3D record immediately
  const model = await model3dSvc.createModel3D(imageId);

  try {
    // ── 1. Upload image to Tripo ────────────────────────────────────────
    emit(res, "upload", "running");
    const uploadResult = await tripo.uploadFile(imageBuffer, filename, mimeType);
    const fileToken    = extractTripoUploadToken(uploadResult);
    emit(res, "upload", "success");

    // ── 2. Mesh generation ──────────────────────────────────────────────
    emit(res, "mesh", "running");
    const meshTask   = await tripo.createTask({
      type: "image_to_model",
      file: { type: mimeType === "image/jpeg" ? "jpeg" : "png", file_token: fileToken },
      model_version: modelVersion as never,
      texture: true,
      pbr: true,
    } as never);
    const meshTaskId = (meshTask.data as any).task_id as string;

    await model3dSvc.updateModel3DProcessing(model.id, { meshTaskId });
    emit(res, "mesh", "queued", { taskId: meshTaskId });

    const meshResult   = await tripo.pollTask(meshTaskId, { intervalMs: 2000 });
    const pbrModelUrl  = meshResult.output?.pbr_model ?? meshResult.output?.model;
    const meshModelUrl = meshResult.output?.model ?? pbrModelUrl;
    emit(res, "mesh", "success", { taskId: meshTaskId });

    // ── 3. Pre-rig check ────────────────────────────────────────────────
    emit(res, "prerig", "running");
    const prerigTask   = await tripo.createTask({
      type: "animate_prerigcheck", original_model_task_id: meshTaskId,
    } as never);
    const prerigTaskId = (prerigTask.data as any).task_id as string;
    await model3dSvc.updateModel3DProcessing(model.id, { prerigTaskId });

    const prerigResult = await tripo.pollTask(prerigTaskId, { intervalMs: 2000 });

    if (!prerigResult.output?.riggable) {
      // Still archive the static GLB even if not riggable
      await model3dSvc.finalizeModel3D(model.id, model.id, {
        pbrModelSourceUrl: pbrModelUrl,
        modelSourceUrl:    meshModelUrl,
      });
      emit(res, "prerig", "failed", { error: "Model is not riggable" });
      sseWrite(res, "complete", { error: "Not riggable — static model archived to GCS.", model3dId: model.id });
      return;
    }
    emit(res, "prerig", "success");

    // ── 4. Rig ──────────────────────────────────────────────────────────
    emit(res, "rig", "running");
    const rigTask   = await tripo.createTask({
      type: "animate_rig", original_model_task_id: meshTaskId, out_format: "glb",
    } as never);
    const rigTaskId = (rigTask.data as any).task_id as string;
    await model3dSvc.updateModel3DProcessing(model.id, { rigTaskId });
    emit(res, "rig", "queued", { taskId: rigTaskId });

    await tripo.pollTask(rigTaskId, { intervalMs: 2000 });

    // Archive the static GLB now (before animations, so it's always saved)
    await model3dSvc.finalizeModel3D(model.id, model.id, {
      pbrModelSourceUrl: pbrModelUrl,
      modelSourceUrl:    meshModelUrl,
    });
    emit(res, "rig", "success");

    // ── 5. Animate — one retarget task per animationKey ─────────────────
    const animationResults: Array<{ animationKey: string; gcsGlbUrl: string; status: string }> = [];

    for (const animationKey of animations) {
      emit(res, "animate", "running", { animationKey });
      const animRecord = await animationSvc.createAnimation(model.id, animationKey);

      try {
        const animTask   = await tripo.createTask({
          type: "animate_retarget",
          original_model_task_id: rigTaskId,
          animations:            [animationKey] as never,
          out_format:            "glb",
          bake_animation:        true,
          export_with_geometry:  true,
        } as never);
        const animTaskId = (animTask.data as any).task_id as string;

        const animResult = await tripo.pollTask(animTaskId, { intervalMs: 2000, timeoutMs: 600_000 });
        const glbUrl     = animResult.output?.model;

        if (!glbUrl) throw new Error("Tripo returned no GLB URL");

        const finalAnim = await animationSvc.finalizeAnimation(animRecord.id, model.id, animationKey, glbUrl);
        animationResults.push({ animationKey, gcsGlbUrl: finalAnim.gcsGlbUrl!, status: "success" });
        emit(res, "animate", "success", { animationKey, gcsGlbUrl: finalAnim.gcsGlbUrl });

      } catch (err) {
        await animationSvc.failAnimation(animRecord.id, String(err));
        animationResults.push({ animationKey, gcsGlbUrl: "", status: "failed" });
        emit(res, "animate", "failed", { animationKey, error: String(err) });
        // Continue with remaining animations
      }
    }

    const finishedModel = await model3dSvc.getModel3D(model.id);
    sseWrite(res, "complete", {
      model3dId:    model.id,
      gcsPbrModelUrl: finishedModel?.gcsPbrModelUrl,
      gcsModelUrl:    finishedModel?.gcsModelUrl,
      animations:     animationResults,
    });

  } catch (err) {
    await model3dSvc.failModel3D(model.id, String(err));
    sseWrite(res, "error", { message: String(err) });
  }
}
```

---

### 14. Pipeline router

File: `src/modules/pipeline/pipeline.router.ts`

```ts
import { Router } from "express";
import multer from "multer";
import fs from "fs";
import { sseHeaders } from "../../lib/sse";
import { runPipeline } from "./pipeline.service";
import * as skinImageSvc from "../skin-images/skin-images.service";

const upload = multer({ storage: multer.memoryStorage() }); // buffer, not disk
const router = Router();

// POST /api/pipeline
// Body (multipart): image, animations[], modelVersion, variantId, figureId
router.post("/", upload.single("image"), async (req, res, next) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "No image file provided" });

  const variantId   = req.body.variantId   as string | undefined;
  const figureId    = req.body.figureId    as string | undefined;

  if (!variantId || !figureId) {
    return res.status(400).json({ error: "variantId and figureId are required" });
  }

  const rawAnimations = req.body.animations as string | string[] | undefined;
  const animations    = Array.isArray(rawAnimations) ? rawAnimations
    : rawAnimations ? [rawAnimations] : ["preset:idle"];
  const modelVersion  = (req.body.modelVersion as string) ?? "v2.5-20250123";
  const mimeType: "image/png" | "image/jpeg" =
    file.mimetype === "image/jpeg" ? "image/jpeg" : "image/png";

  // Archive the source image to GCS and create SkinImage record
  const sourceUrl  = `data:${mimeType};base64,...`; // placeholder — replace with actual origin URL
  // If image was generated by AIML, pass the AIML URL instead. For user-uploaded images,
  // upload buffer directly to GCS and use GCS URL as sourceUrl.
  const imageUrl   = `images/figures/${figureId}/${variantId}/${Date.now()}-source.${mimeType === "image/jpeg" ? "jpg" : "png"}`;
  const { gcsUrl } = await require("../../integrations/gcs/gcs.service")
    .uploadBuffer(file.buffer, imageUrl, mimeType);
  const skinImage  = await skinImageSvc.createSkinImage(variantId, figureId, gcsUrl);

  sseHeaders(res);
  try {
    await runPipeline({
      imageId:      skinImage.id,
      figureId,
      imageBuffer:  file.buffer,
      filename:     file.originalname ?? "upload.png",
      mimeType,
      animations,
      modelVersion,
      res,
    });
  } catch (e) { next(e); } finally { res.end(); }
});

export default router;
```

---

### 15. Update all routers in `src/server.ts`

```ts
import express    from "express";
import cookieParser from "cookie-parser";
import { env }    from "./config/env";
import { prisma } from "./db/client";
import { errorHandler } from "./middleware/errorHandler";

import figuresRouter    from "./modules/figures/figures.router";
import skinsRouter      from "./modules/skins/skins.router";
import variantsRouter   from "./modules/skin-variants/skin-variants.router";
import imagesRouter     from "./modules/skin-images/skin-images.router";
import models3dRouter   from "./modules/models3d/models3d.router";
import animationsRouter from "./modules/animations/animations.router";
import pipelineRouter   from "./modules/pipeline/pipeline.router";

const app = express();
app.use(cookieParser());
app.use(express.json());

app.use("/api/figures",                                              figuresRouter);
app.use("/api/figures/:figureId/skins",                             skinsRouter);
app.use("/api/figures/:figureId/skins/:skinId/variants",            variantsRouter);
app.use("/api/figures/:figureId/skins/:skinId/variants/:variantId/images", imagesRouter);
app.use("/api/models3d/:model3dId/animations",                      animationsRouter);
app.use("/api/pipeline",                                            pipelineRouter);

app.use(errorHandler);

prisma.$connect()
  .then(() => app.listen(env.PORT, () => console.log(`Server on :${env.PORT}`)))
  .catch(err => { console.error("MongoDB connection failed:", err.message); process.exit(1); });
```

---

### 16. Seed script

File: `prisma/seed.ts`

Read `assets/figures/figures.json` and reconstruct the full document hierarchy into MongoDB.

```ts
import { prisma } from "../src/db/client";
import data from "../assets/figures/figures.json";

async function seedVariant(skinId: string, variant: "A" | "B", vData: any) {
  const ip = vData?.imagePrompt;
  if (!ip) return;

  const sv = await prisma.skinVariant.upsert({
    where:  { skinId_variant: { skinId, variant } },
    update: {},
    create: {
      skinId, variant,
      prompt:         ip.prompt,
      negativePrompt: ip.negativePrompt,
      imageModel:     ip.model,
    },
  });

  for (const imgObj of (ip.images ?? [])) {
    const si = await prisma.skinImage.create({
      data: { variantId: sv.id, sourceUrl: imgObj.url, gcsUrl: null },
    });

    for (const m of (imgObj.models3d ?? [])) {
      const m3 = await prisma.model3D.create({
        data: {
          imageId:           si.id,
          status:            m.status ?? "failed",
          error:             m.error ?? null,
          meshTaskId:        m.meshTaskId ?? null,
          prerigTaskId:      m.prerigTaskId ?? null,
          rigTaskId:         m.rigTaskId ?? null,
          pbrModelSourceUrl: m.pbrModelUrl ?? null,
          modelSourceUrl:    m.modelUrl ?? null,
          // GCS URLs are null for seeded data — Tripo URLs may have expired
        },
      });

      for (const anim of (m.animations ?? [])) {
        await prisma.animation.create({
          data: {
            model3dId:      m3.id,
            animationKey:   anim.animationKey,
            retargetTaskId: anim.retargetTaskId ?? null,
            glbSourceUrl:   anim.glbUrl ?? null,
            gcsGlbUrl:      null, // original Tripo URLs may be expired
            status:         anim.status ?? "success",
          },
        });
      }
    }
  }
}

async function main() {
  for (const fig of data as any[]) {
    const figure = await prisma.figure.create({
      data: { name: fig.name, type: fig.type ?? "figure" },
    });

    // Base / default skin
    const baseSkin = await prisma.skin.create({
      data: { figureId: figure.id, name: null, isBase: true },
    });
    await seedVariant(baseSkin.id, "A", fig.default?.variantA);
    await seedVariant(baseSkin.id, "B", fig.default?.variantB);

    // Named skins
    for (const sk of (fig.skins ?? [])) {
      const skin = await prisma.skin.create({
        data: { figureId: figure.id, name: sk.name, isBase: false },
      });
      await seedVariant(skin.id, "A", sk.variantA);
      await seedVariant(skin.id, "B", sk.variantB);
    }
  }
  console.log("Seed complete");
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

Add to `package.json`:
```json
"prisma": { "seed": "ts-node prisma/seed.ts" }
```

---

## GCS bucket setup (one-time)

```bash
# Create the bucket
gcloud storage buckets create gs://3d-figures-assets \
  --project=YOUR_PROJECT_ID \
  --location=US \
  --uniform-bucket-level-access

# Make publicly readable (for serving assets)
gcloud storage buckets add-iam-policy-binding gs://3d-figures-assets \
  --member=allUsers --role=roles/storage.objectViewer

# Create service account for the app
gcloud iam service-accounts create 3d-figures-app \
  --display-name="3D Figures App"

# Grant write access
gcloud storage buckets add-iam-policy-binding gs://3d-figures-assets \
  --member=serviceAccount:3d-figures-app@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/storage.objectAdmin

# Download key
gcloud iam service-accounts keys create ./gcs-key.json \
  --iam-account=3d-figures-app@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

Add `gcs-key.json` to `.gitignore`.

---

## Acceptance criteria

- [ ] `npx prisma db push` runs without errors.
- [ ] `npx prisma db seed` imports all figures with full hierarchy (skins → variants → images → models → animations).
- [ ] Zero JSON arrays remain in the DB for skins, images, models, or animations — each is its own document.
- [ ] `GET /api/figures` returns the full nested hierarchy.
- [ ] `POST /api/pipeline` runs the Tripo pipeline, writes each step to MongoDB, and archives GLBs to GCS. The `complete` SSE event contains `gcsPbrModelUrl` and per-animation `gcsGlbUrl` values.
- [ ] `DELETE /api/figures/:id` cascades through all 5 levels of the hierarchy.
- [ ] `AIML_API_KEY` or `TRIPO_API_KEY` or `GCS_BUCKET` missing → server exits with a clear error message.
- [ ] Tripo source URLs are stored alongside the GCS URLs (for debugging), but the UI only links to `gcs*` URLs.
- [ ] No Prisma or GCS calls outside `*.service.ts` files.
