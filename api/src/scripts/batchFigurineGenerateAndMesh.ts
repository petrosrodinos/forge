/**
 * Batch-generate game-reference images (AimlAPI) + Tripo meshes per FIGURE_TYPES.
 * Config: src/scripts/batch-figurine-generation.config.json
 *
 * Usage (from api/): npm run figurines:batch-generate [path/to/config.json]
 *
 * Requires: AIML_API_KEY, TRIPO_API_KEY
 */
import "dotenv/config";
import axios, { isAxiosError } from "axios";
import path from "path";
import { mkdir, readFile, readdir, writeFile } from "fs/promises";

import { AimlApiService } from "../integrations/aimlapi/AimlApiService";
import { TripoService } from "../integrations/trippo/TripoService";
import { extractTripoUploadToken } from "../integrations/trippo/uploadToken";
import { fetchImageAsBuffer } from "../lib/image-fetch.util";
import { canonicalImageModelId, ImageModels } from "../config/models/image-models";
import { TrippoModels } from "../config/models/trippo-models";
import { TRIPO_CONFIG } from "../modules/tripo/config/tripo.config";
import type { ModelVersion } from "../integrations/trippo/types";
import { FIGURE_TYPES, type FigureTypeValue, isFigureTypeValue } from "../config/figure-types";
import { FIGURE_TYPE_SUBJECTS } from "./figure-type-generation-subjects";
import type { ImageGenerationResponse } from "../integrations/aimlapi/types";

const DEFAULT_TECHNIQUE_BLOCK =
  "Professional real-time game asset reference for image-to-3D mesh: exactly one subject, fully contained in frame with generous margins, nothing cropped or cut off, entire silhouette readable, centered composition, crisp edges and high-frequency detail, even neutral studio lighting, absolutely no cast shadows and no contact or ambient shadows, no ground plane or floor, pure solid white background only (#FFFFFF), no gradients or vignette, no environment or scenery, no text or logos, PBR-friendly material read, clean topology-friendly forms, sharp focus, ultra high detail, product-turnaround quality.";

const DEFAULT_NEGATIVE_PROMPT =
  "shadows, drop shadow, contact shadow, ambient occlusion darkening, ground, floor, pedestal, backdrop gradient, environment, scenery, sky, horizon, multiple separate objects, duplicate subjects, collage, split image, cropped, cut off, truncated, out of frame, blurry, motion blur, depth of field on subject, low resolution, noise, compression artifacts, watermark, text, logo, UI, wireframe, human crowd, busy background, fog, haze obscuring silhouette";

type BatchConfig = {
  version: number;
  /** When null or empty, all FIGURE_TYPES run. Otherwise only these `value` keys (see api/src/config/figure-types.ts). */
  figureTypes?: string[] | null;
  generationsPerType: number;
  aiml: {
    model: string;
    size?: string;
    n?: number;
    steps?: number | null;
    response_format?: string;
  };
  tripo: {
    model_version: string;
    texture: boolean;
    pbr: boolean;
    poll: { intervalMs: number; timeoutMs: number };
  };
  output: {
    baseDir: string;
    manifestFile: string;
  };
  prompt?: {
    techniqueBlock?: string | null;
    negativePrompt?: string | null;
  };
  /** Limits parallel jobs and retries Aiml rate limits (see terminal: "exceeded the limit of generation"). */
  run?: {
    concurrency?: number;
    aimlMaxRetries?: number;
    aimlRetryDelayMs?: number;
  };
};

type FlatJob = {
  figureValue: FigureTypeValue;
  figureLabel: string;
  generationIndex: number;
  prompt: string;
  negativePrompt: string;
};

type ManifestEntry = {
  figureType: FigureTypeValue;
  figureLabel: string;
  generationIndex: number;
  prompt: string;
  negativePrompt: string;
  folderRelative: string;
  imagePath: string;
  glbPath: string;
  imageUrl?: string;
  meshTaskId?: string;
  modelUrl?: string;
  error?: string;
  imageCostUsd?: number;
  meshCostUsd?: number;
};

function defaultConfigPath(): string {
  return path.join(__dirname, "./batch-figurine-generation.config.json");
}

function mergePromptForAiml(prompt: string, negativePrompt: string): string {
  const neg = negativePrompt.trim();
  if (!neg) return prompt.trim();
  return `${prompt.trim()}\n\nNegative prompt: ${neg}`;
}

function viewInstructionForType(value: FigureTypeValue): string {
  switch (value) {
    case "obstacle":
    case "building":
    case "environment_prop":
      return "Camera: isometric three-quarter view; show the entire prop with clear silhouette and readable depth.";
    case "vehicle":
      return "Camera: three-quarter front view; entire vehicle in frame including all wheels or landing gear.";
    case "creature":
    case "mount":
      return "Camera: three-quarter front view; full creature body visible, all limbs and extremities in frame.";
    case "weapon":
    case "armor":
    case "item":
    case "projectile":
      return "Camera: centered hero shot, slight three-quarter angle; complete object, no parts clipped.";
    case "effect":
      return "Camera: centered front view; one self-contained effect volume, readable silhouette for stylized 3D.";
    case "humanoid":
    case "npc":
      return "Camera: straight front orthographic-style view; full body head to toe in frame, neutral stance.";
    default:
      return "Camera: centered, entire subject visible with safe margins.";
  }
}

function buildPromptsForJob(
  figureValue: FigureTypeValue,
  figureLabel: string,
  generationIndex: number,
  techniqueBlock: string,
  negativePrompt: string,
): { prompt: string; negativePrompt: string } {
  const subjects = FIGURE_TYPE_SUBJECTS[figureValue];
  if (!subjects) throw new Error(`Missing FIGURE_TYPE_SUBJECTS for ${figureValue}`);
  const subject = subjects[generationIndex - 1];
  if (!subject) throw new Error(`Invalid generation index ${generationIndex}`);

  const view = viewInstructionForType(figureValue);
  const prompt = `AAA game production art, ${figureLabel} asset type: ${subject}. ${view} ${techniqueBlock}`;

  return { prompt, negativePrompt };
}

function resolveFigureTypes(cfg: BatchConfig): { value: FigureTypeValue; label: string }[] {
  if (!cfg.figureTypes?.length) {
    return FIGURE_TYPES.map((t) => ({ value: t.value, label: t.label }));
  }
  const out: { value: FigureTypeValue; label: string }[] = [];
  for (const raw of cfg.figureTypes) {
    if (!isFigureTypeValue(raw)) {
      throw new Error(`Unknown figure type "${raw}". Use values from FIGURE_TYPES (api/src/config/figure-types.ts).`);
    }
    const entry = FIGURE_TYPES.find((t) => t.value === raw);
    if (entry) out.push({ value: entry.value, label: entry.label });
  }
  return out;
}

/** Highest N among existing directories named `generation N` under a figure type folder; 0 if none. */
async function scanMaxGenerationFolderIndex(figureTypeDir: string): Promise<number> {
  let max = 0;
  try {
    const dirents = await readdir(figureTypeDir, { withFileTypes: true });
    for (const d of dirents) {
      if (!d.isDirectory()) continue;
      const m = /^generation (\d+)$/i.exec(d.name);
      if (m) {
        const n = Number.parseInt(m[1]!, 10);
        if (Number.isFinite(n)) max = Math.max(max, n);
      }
    }
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") throw e;
  }
  return max;
}

function subjectSlotForFolderIndex(figureValue: FigureTypeValue, folderIndex: number): number {
  const subjects = FIGURE_TYPE_SUBJECTS[figureValue];
  const len = subjects.length;
  return ((folderIndex - 1) % len) + 1;
}

function flattenJobs(
  cfg: BatchConfig,
  techniqueBlock: string,
  negativePrompt: string,
  maxExistingByType: Map<FigureTypeValue, number>,
): FlatJob[] {
  const types = resolveFigureTypes(cfg);
  const n = cfg.generationsPerType;
  if (!Number.isInteger(n) || n < 1) throw new Error("generationsPerType must be a positive integer");

  const jobs: FlatJob[] = [];
  for (const t of types) {
    const maxExisting = maxExistingByType.get(t.value) ?? 0;
    for (let slot = 1; slot <= n; slot++) {
      const folderIndex = maxExisting + slot;
      const subjectSlot = subjectSlotForFolderIndex(t.value, folderIndex);
      const { prompt, negativePrompt: neg } = buildPromptsForJob(
        t.value,
        t.label,
        subjectSlot,
        techniqueBlock,
        negativePrompt,
      );
      jobs.push({
        figureValue: t.value,
        figureLabel: t.label,
        generationIndex: folderIndex,
        prompt,
        negativePrompt: neg,
      });
    }
  }
  return jobs;
}

function assertConfig(cfg: unknown): asserts cfg is BatchConfig {
  if (!cfg || typeof cfg !== "object") throw new Error("Config must be a JSON object");
  const c = cfg as BatchConfig;
  if (c.version !== 2) throw new Error("config.version must be 2 for this script");
  if (!c.aiml?.model) throw new Error("config.aiml.model is required");
  if (!c.tripo?.model_version) throw new Error("config.tripo.model_version is required");
  if (typeof c.generationsPerType !== "number") throw new Error("config.generationsPerType is required");
  if (!c.output?.baseDir) throw new Error("config.output.baseDir is required");
  if (!c.output?.manifestFile) throw new Error("config.output.manifestFile is required");
}

function jobLabel(job: FlatJob): string {
  return `${job.figureValue}/generation ${job.generationIndex}`;
}

function logBatch(event: string, detail?: Record<string, unknown>): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), scope: "batch", event, ...detail }));
}

function logJob(job: FlatJob, event: string, detail?: Record<string, unknown>): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), scope: "job", job: jobLabel(job), event, ...detail }));
}

function getCatalogImageUsdPerImage(modelId: string): number {
  const id = canonicalImageModelId(modelId.trim());
  const row = ImageModels.find((m) => m.id === id);
  if (!row) throw new Error(`Unknown image model for pricing: ${modelId}`);
  return row.price_original;
}

function getCatalogTripoImageToModelUsd(): number {
  const row = TrippoModels.find((m) => m.id === "image_to_model");
  if (!row) throw new Error("TrippoModels missing image_to_model");
  const p = row.price_original;
  return typeof p === "number" ? p : Number.parseFloat(String(p));
}

async function downloadToFile(url: string, dest: string): Promise<void> {
  const res = await axios.get<ArrayBuffer>(url, { responseType: "arraybuffer", timeout: 300_000 });
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(res.data));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorText(e: unknown): string {
  if (isAxiosError(e)) {
    const data = e.response?.data;
    const body =
      typeof data === "object" && data !== null ? JSON.stringify(data) : String(data ?? "");
    return `${e.message} ${e.response?.status ?? ""} ${body}`;
  }
  return e instanceof Error ? e.message : String(e);
}

function isAimlRateLimitError(e: unknown): boolean {
  if (isAxiosError(e) && e.response?.status === 429) return true;
  const t = errorText(e);
  return (
    /exceeded the limit of generation/i.test(t) ||
    /\[\s*2000\s*\]/.test(t) ||
    /\b429\b/.test(t) ||
    /rate\s*limit/i.test(t)
  );
}

function retryAfterMsFromError(e: unknown, attempt: number, baseMs: number): number {
  if (isAxiosError(e)) {
    const raw = e.response?.headers?.["retry-after"] ?? e.response?.headers?.["Retry-After"];
    if (raw != null) {
      const sec = Number.parseInt(String(raw).trim(), 10);
      if (Number.isFinite(sec) && sec > 0 && sec < 7200) return sec * 1000;
    }
  }
  return Math.min(baseMs * 2 ** (attempt - 1), 120_000);
}

async function generateImageWithRetry(
  aiml: AimlApiService,
  genBody: Record<string, unknown>,
  job: FlatJob,
  maxAttempts: number,
  baseDelayMs: number,
): Promise<ImageGenerationResponse> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data } = await aiml.generateImage(genBody);
      return data;
    } catch (e) {
      lastErr = e;
      if (!isAimlRateLimitError(e)) throw e;
      if (attempt >= maxAttempts) break;
      const delay = retryAfterMsFromError(e, attempt, baseDelayMs);
      logJob(job, "aiml_rate_limited_backoff", {
        attempt,
        maxAttempts,
        delayMs: delay,
        hint: "Lower run.concurrency or wait; AimlAPI limits concurrent generations.",
      });
      await sleep(delay);
    }
  }
  throw lastErr;
}

/** Run async work with at most `concurrency` in flight; preserves result order. */
async function mapPool<T, R>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  if (items.length === 0) return [];
  const c = Math.max(1, Math.min(Math.floor(concurrency), items.length));
  const results = new Array<R>(items.length);
  let next = 0;

  async function runWorker(): Promise<void> {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i]!, i);
    }
  }

  await Promise.all(Array.from({ length: c }, () => runWorker()));
  return results;
}

async function processJob(
  job: FlatJob,
  cfg: BatchConfig,
  model: string,
  imageUsd: number,
  meshUsd: number,
  aiml: AimlApiService,
  tripo: TripoService,
  assetsRoot: string,
  baseOutDir: string,
): Promise<ManifestEntry> {
  const genFolder = path.join(baseOutDir, job.figureValue, `generation ${job.generationIndex}`);
  await mkdir(genFolder, { recursive: true });

  const entry: ManifestEntry = {
    figureType: job.figureValue,
    figureLabel: job.figureLabel,
    generationIndex: job.generationIndex,
    prompt: job.prompt,
    negativePrompt: job.negativePrompt,
    folderRelative: path.relative(assetsRoot, genFolder).replace(/\\/g, "/"),
    imagePath: "",
    glbPath: "",
  };

  logJob(job, "job_start", { folder: entry.folderRelative });

  const runOpts = cfg.run ?? {};
  const aimlMaxRetries = Math.max(1, runOpts.aimlMaxRetries ?? 8);
  const aimlRetryDelayMs = Math.max(1000, runOpts.aimlRetryDelayMs ?? 10_000);

  try {
    const finalPrompt = mergePromptForAiml(job.prompt, job.negativePrompt);
    const genBody: Record<string, unknown> = {
      model,
      prompt: finalPrompt,
      n: cfg.aiml.n ?? 1,
    };
    if (cfg.aiml.size) genBody.size = cfg.aiml.size;
    if (cfg.aiml.steps != null) genBody.steps = cfg.aiml.steps;
    if (cfg.aiml.response_format) genBody.response_format = cfg.aiml.response_format;

    logJob(job, "aiml_generate_start", { model, aimlMaxRetries });
    const tAiml = Date.now();
    const imageRes = await generateImageWithRetry(aiml, genBody, job, aimlMaxRetries, aimlRetryDelayMs);
    logJob(job, "aiml_generate_done", { ms: Date.now() - tAiml });

    const first = imageRes.data?.[0];
    const imageUrl =
      first?.url ?? (first?.b64_json ? `data:image/png;base64,${first.b64_json}` : null);
    if (!imageUrl || typeof imageUrl !== "string") {
      throw new Error("Image generation returned no URL/b64_json");
    }
    entry.imageUrl = imageUrl.startsWith("data:") ? "(inline base64)" : imageUrl;

    logJob(job, "fetch_image_buffer_start");
    const { buffer, mimeType } = await fetchImageAsBuffer(imageUrl, TRIPO_CONFIG.PROXY_MAX_BYTES);
    const ext = mimeType === "image/jpeg" ? "jpg" : "png";
    const imageFilename = `reference.${ext}`;
    const imagePath = path.join(genFolder, imageFilename);
    await writeFile(imagePath, buffer);
    entry.imagePath = path.relative(assetsRoot, imagePath).replace(/\\/g, "/");
    logJob(job, "write_image_done", { path: entry.imagePath });

    logJob(job, "tripo_upload_start");
    const upload = await tripo.uploadFile(
      buffer,
      imageFilename,
      mimeType === "image/jpeg" ? "image/jpeg" : "image/png",
    );
    const fileToken = extractTripoUploadToken(upload);

    const imgType = mimeType === "image/jpeg" ? "jpeg" : "png";
    const { createTaskResponse: meshCreated } = await tripo.createTask({
      type: "image_to_model",
      file: { type: imgType, file_token: fileToken },
      model_version: cfg.tripo.model_version as ModelVersion,
      texture: cfg.tripo.texture,
      pbr: cfg.tripo.pbr,
    } as never);

    const meshTaskId = meshCreated.data.task_id;
    if (!meshTaskId) throw new Error("Tripo did not return mesh task_id");
    entry.meshTaskId = meshTaskId;
    logJob(job, "tripo_mesh_task_created", { meshTaskId });

    const meshTask = await tripo.pollTask(meshTaskId, cfg.tripo.poll);
    const glbUrl =
      meshTask.output?.pbr_model ?? meshTask.output?.model ?? meshTask.output?.base_model;
    if (!glbUrl || typeof glbUrl !== "string") {
      throw new Error("Mesh task succeeded but no GLB URL in output");
    }
    entry.modelUrl = glbUrl;

    const glbPath = path.join(genFolder, "mesh.glb");
    await downloadToFile(glbUrl, glbPath);
    entry.glbPath = path.relative(assetsRoot, glbPath).replace(/\\/g, "/");
    entry.imageCostUsd = imageUsd;
    entry.meshCostUsd = meshUsd;

    logJob(job, "job_success", { imagePath: entry.imagePath, glbPath: entry.glbPath });
  } catch (e) {
    entry.error = e instanceof Error ? e.message : String(e);
    logJob(job, "job_failed", { error: entry.error });
  }

  return entry;
}

type StoredManifest = {
  configPath?: string;
  startedAt?: string;
  entries?: ManifestEntry[];
  [key: string]: unknown;
};

async function readExistingManifest(manifestPath: string): Promise<StoredManifest | null> {
  try {
    const text = await readFile(manifestPath, "utf8");
    const data = JSON.parse(text) as StoredManifest;
    return data && typeof data === "object" ? data : null;
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") return null;
    throw e;
  }
}

async function main() {
  const configPath = path.resolve(process.argv[2] ?? defaultConfigPath());
  logBatch("load_config", { configPath });

  const raw = JSON.parse(await readFile(configPath, "utf8")) as unknown;
  assertConfig(raw);
  const cfg = raw;

  const techniqueBlock = (cfg.prompt?.techniqueBlock ?? DEFAULT_TECHNIQUE_BLOCK).trim();
  const negativePrompt = (cfg.prompt?.negativePrompt ?? DEFAULT_NEGATIVE_PROMPT).trim();

  const apiRoot = path.join(__dirname, "../..");
  const assetsRoot = path.join(apiRoot, "assets");
  const baseOutDir = path.join(assetsRoot, cfg.output.baseDir);
  const manifestPath = path.join(assetsRoot, cfg.output.manifestFile);

  await mkdir(baseOutDir, { recursive: true });

  const types = resolveFigureTypes(cfg);
  const maxExistingByType = new Map<FigureTypeValue, number>();
  for (const t of types) {
    const typeDir = path.join(baseOutDir, t.value);
    const max = await scanMaxGenerationFolderIndex(typeDir);
    maxExistingByType.set(t.value, max);
  }

  const aiml = new AimlApiService();
  const tripo = new TripoService();
  const jobs = flattenJobs(cfg, techniqueBlock, negativePrompt, maxExistingByType);
  const model = canonicalImageModelId(cfg.aiml.model.trim());

  const imageUnitUsd = getCatalogImageUsdPerImage(model);
  const meshUnitUsd = getCatalogTripoImageToModelUsd();

  const offsetLog = Object.fromEntries(
    types.map((t) => {
      const max = maxExistingByType.get(t.value) ?? 0;
      return [
        t.value,
        { maxExistingGenerationFolder: max, nextFolders: `${max + 1}..${max + cfg.generationsPerType}` },
      ];
    }),
  );

  logBatch("batch_setup_complete", {
    jobCount: jobs.length,
    figureTypeCount: types.length,
    generationsPerType: cfg.generationsPerType,
    generationFolderOffsets: offsetLog,
    note: "Existing generation folders are preserved; new runs use the next free generation numbers per figure type.",
    aimlModel: model,
    catalogImageUsdPerImage: imageUnitUsd,
    catalogMeshUsdPerGlb: meshUnitUsd,
    expectedTotalIfAllSucceedUsd: jobs.length * (imageUnitUsd + meshUnitUsd),
    outputRoot: path.relative(apiRoot, baseOutDir).replace(/\\/g, "/"),
  });

  const priorManifest = await readExistingManifest(manifestPath);
  const priorEntries = Array.isArray(priorManifest?.entries) ? priorManifest!.entries! : [];
  const runStartedAt = new Date().toISOString();

  const manifest: {
    configPath: string;
    startedAt: string;
    lastRunStartedAt: string;
    finishedAt?: string;
    figureTypesResolved: { value: string; label: string }[];
    generationsPerType: number;
    catalogPricing: { imageModel: string; imageUsdEach: number; trippoMeshUsdEach: number };
    costSummary?: {
      successfulJobs: number;
      failedJobs: number;
      imageTotalUsd: number;
      meshTotalUsd: number;
      combinedTotalUsd: number;
    };
    entries: ManifestEntry[];
  } = {
    configPath,
    startedAt: typeof priorManifest?.startedAt === "string" ? priorManifest.startedAt : runStartedAt,
    lastRunStartedAt: runStartedAt,
    figureTypesResolved: types,
    generationsPerType: cfg.generationsPerType,
    catalogPricing: {
      imageModel: model,
      imageUsdEach: imageUnitUsd,
      trippoMeshUsdEach: meshUnitUsd,
    },
    entries: priorEntries,
  };

  const concurrency = Math.max(1, Math.floor(cfg.run?.concurrency ?? 2));
  logBatch("job_pool_start", {
    concurrency,
    jobCount: jobs.length,
    note: "High concurrency triggers AimlAPI 'exceeded the limit of generation'; default is 2.",
  });
  const tAll = Date.now();

  const entries = await mapPool(jobs, concurrency, (job) =>
    processJob(job, cfg, model, imageUnitUsd, meshUnitUsd, aiml, tripo, assetsRoot, baseOutDir),
  );

  logBatch("job_pool_done", { ms: Date.now() - tAll, jobCount: entries.length });

  const successful = entries.filter((e) => !e.error);
  const failed = entries.filter((e) => e.error);
  const imageTotalUsd = successful.reduce((s, e) => s + (e.imageCostUsd ?? 0), 0);
  const meshTotalUsd = successful.reduce((s, e) => s + (e.meshCostUsd ?? 0), 0);
  const combinedTotalUsd = imageTotalUsd + meshTotalUsd;

  manifest.entries = [...priorEntries, ...entries];
  manifest.finishedAt = new Date().toISOString();
  manifest.costSummary = {
    successfulJobs: successful.length,
    failedJobs: failed.length,
    imageTotalUsd,
    meshTotalUsd,
    combinedTotalUsd,
  };

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  logBatch("cost_report", {
    currency: "USD",
    note: "Totals use catalog price_original from api image/trippo model config × successful jobs (provider list pricing, pre-wallet markup).",
    imageGenerationsBilled: successful.length,
    imageTotalUsd: Number(imageTotalUsd.toFixed(4)),
    meshTasksBilled: successful.length,
    meshTotalUsd: Number(meshTotalUsd.toFixed(4)),
    combinedTotalUsd: Number(combinedTotalUsd.toFixed(4)),
    failedJobs: failed.length,
  });

  logBatch("batch_complete", { manifestPath });

  console.log("\n--- Cost summary (USD, catalog unit price × successful jobs) ---");
  console.log(`  Image generations (${successful.length} ok): $${imageTotalUsd.toFixed(4)}`);
  console.log(`  Tripo image→mesh (${successful.length} ok): $${meshTotalUsd.toFixed(4)}`);
  console.log(`  Total: $${combinedTotalUsd.toFixed(4)}`);
  if (failed.length) console.log(`  Failed jobs (not billed in totals above): ${failed.length}`);
  console.log("---\n");
}

main().catch((e) => {
  logBatch("batch_fatal", { error: e instanceof Error ? e.message : String(e) });
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
