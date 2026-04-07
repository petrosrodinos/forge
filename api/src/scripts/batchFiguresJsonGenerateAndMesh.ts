/**
 * Batch-generate images (AimlAPI) + Tripo meshes for every figure/skin/variant in api/assets/figures.json.
 *
 * Output structure (under api/assets/figures/):
 *   figures/<figure-name>/<skin-label>/variant-<X>/reference.png
 *   figures/<figure-name>/<skin-label>/variant-<X>/mesh.glb
 *
 * Usage (from api/):
 *   npx ts-node -r dotenv/config src/scripts/batchFiguresJsonGenerateAndMesh.ts
 *   npx ts-node -r dotenv/config src/scripts/batchFiguresJsonGenerateAndMesh.ts [concurrency]
 *
 * Requires: AIML_API_KEY, TRIPO_API_KEY
 */
import "dotenv/config";
import axios, { isAxiosError } from "axios";
import path from "path";
import { mkdir, readFile, writeFile } from "fs/promises";

import { AimlApiService } from "../integrations/aimlapi/AimlApiService";
import { TripoService } from "../integrations/trippo/TripoService";
import { extractTripoUploadToken } from "../integrations/trippo/uploadToken";
import { fetchImageAsBuffer } from "../lib/image-fetch.util";
import { canonicalImageModelId } from "../config/models/image-models";
import { TRIPO_CONFIG } from "../modules/tripo/config/tripo.config";
import { TRIPO_JOB_CONFIG } from "../modules/tripo/tripo-job.config";
import type { ModelVersion } from "../integrations/trippo/types";
import type { ImageGenerationResponse } from "../integrations/aimlapi/types";

// ---------------------------------------------------------------------------
// Types derived from figures.json
// ---------------------------------------------------------------------------

type FigureVariant = {
  id: string;
  skinId: string;
  variant: string;
  name: string | null;
  prompt: string;
  negativePrompt: string;
  imageModel: string;
};

type FigureSkin = {
  id: string;
  figureId: string;
  name: string | null;
  isBase: boolean;
  variants: FigureVariant[];
};

type Figure = {
  id: string;
  name: string;
  type: string;
  skins: FigureSkin[];
};

// ---------------------------------------------------------------------------
// Job types
// ---------------------------------------------------------------------------

type Job = {
  figureName: string;
  skinLabel: string;
  variantLetter: string;
  prompt: string;
  negativePrompt: string;
  imageModel: string;
  /** Resolved output folder (absolute) */
  outDir: string;
};

type ManifestEntry = {
  figureName: string;
  skinLabel: string;
  variantLetter: string;
  prompt: string;
  negativePrompt: string;
  imageModel: string;
  folderRelative: string;
  imagePath: string;
  glbPath: string;
  imageUrl?: string;
  meshTaskId?: string;
  modelUrl?: string;
  error?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeFolderName(name: string): string {
  return name
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

const MESH_READY_SUFFIX =
  "Single isolated subject only, exactly one object in the scene, nothing else. " +
  "Game asset reference for image-to-3D mesh: fully contained in frame with generous margins, entire silhouette visible and unclipped, " +
  "centered composition, pure solid white background (#FFFFFF) only, absolutely no cast shadows, no drop shadows, no ambient occlusion darkening, " +
  "no ground plane, no floor, no pedestal, no environment, no scenery, no gradients, no vignette, " +
  "crisp edges, sharp focus, ultra high detail, even neutral studio lighting, PBR-friendly material read, product-turnaround quality.";

const MESH_READY_NEGATIVE_SUFFIX =
  "multiple objects, duplicate subjects, group of figures, crowd, collage, split image, " +
  "shadows, drop shadow, contact shadow, ambient occlusion darkening, ground, floor, pedestal, " +
  "backdrop gradient, environment, scenery, sky, horizon, " +
  "cropped, cut off, truncated, out of frame, blurry, low resolution, noise, watermark, text, logo, wireframe";

function buildFinalPrompt(prompt: string, negativePrompt: string): { prompt: string; negativePrompt: string } {
  const enhancedPrompt = `${prompt.trim()} ${MESH_READY_SUFFIX}`;
  const enhancedNegative = negativePrompt.trim()
    ? `${negativePrompt.trim()}, ${MESH_READY_NEGATIVE_SUFFIX}`
    : MESH_READY_NEGATIVE_SUFFIX;
  return { prompt: enhancedPrompt, negativePrompt: enhancedNegative };
}

function mergePromptForAiml(prompt: string, negativePrompt: string): string {
  const neg = negativePrompt.trim();
  if (!neg) return prompt.trim();
  return `${prompt.trim()}\n\nNegative prompt: ${neg}`;
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
  jobLabel: string,
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
      log("aiml_rate_limited_backoff", { job: jobLabel, attempt, maxAttempts, delayMs: delay });
      await sleep(delay);
    }
  }
  throw lastErr;
}

async function downloadToFile(url: string, dest: string): Promise<void> {
  const res = await axios.get<ArrayBuffer>(url, { responseType: "arraybuffer", timeout: 300_000 });
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(res.data));
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
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

function log(event: string, detail?: Record<string, unknown>): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...detail }));
}

// ---------------------------------------------------------------------------
// Build jobs from figures.json
// ---------------------------------------------------------------------------

function buildJobs(figures: Figure[], figuresOutDir: string, assetsRoot: string): Job[] {
  const jobs: Job[] = [];

  for (const figure of figures) {
    const figureFolder = sanitizeFolderName(figure.name);

    const firstSkin = figure.skins[0];
    if (!firstSkin) continue;

    const skinLabel = firstSkin.name ? sanitizeFolderName(firstSkin.name) : "base";

    for (const variant of firstSkin.variants.slice(0, 2)) {
        if (!variant.prompt?.trim()) {
          log("skip_variant_no_prompt", {
            figure: figure.name,
            skin: skinLabel,
            variant: variant.variant,
          });
          continue;
        }

        const variantFolder = `variant-${variant.variant}`;
        const outDir = path.join(figuresOutDir, figureFolder, skinLabel, variantFolder);

        jobs.push({
          figureName: figure.name,
          skinLabel,
          variantLetter: variant.variant,
          prompt: variant.prompt,
          negativePrompt: variant.negativePrompt ?? "",
          imageModel: variant.imageModel,
          outDir,
        });
    }
  }

  return jobs;
}

// ---------------------------------------------------------------------------
// Process a single job
// ---------------------------------------------------------------------------

const AIML_MAX_RETRIES = 8;
const AIML_RETRY_DELAY_MS = 10_000;
const TRIPO_MODEL_VERSION: ModelVersion = TRIPO_CONFIG.DEFAULT_TRIPO_MODEL_VERSION as ModelVersion;
const TRIPO_POLL = {
  intervalMs: TRIPO_JOB_CONFIG.DEFAULT_POLL_INTERVAL_MS,
  timeoutMs: TRIPO_JOB_CONFIG.MESH_POLL_TIMEOUT_MS,
};

async function processJob(
  job: Job,
  aiml: AimlApiService,
  tripo: TripoService,
  assetsRoot: string,
): Promise<ManifestEntry> {
  await mkdir(job.outDir, { recursive: true });

  const label = `${job.figureName}/${job.skinLabel}/variant-${job.variantLetter}`;
  const folderRelative = path.relative(assetsRoot, job.outDir).replace(/\\/g, "/");

  const entry: ManifestEntry = {
    figureName: job.figureName,
    skinLabel: job.skinLabel,
    variantLetter: job.variantLetter,
    prompt: job.prompt,
    negativePrompt: job.negativePrompt,
    imageModel: job.imageModel,
    folderRelative,
    imagePath: "",
    glbPath: "",
  };

  log("job_start", { job: label, folder: folderRelative });

  try {
    // --- Image generation ---
    const model = canonicalImageModelId(job.imageModel.trim());
    const { prompt: enhancedPrompt, negativePrompt: enhancedNegative } = buildFinalPrompt(job.prompt, job.negativePrompt);
    const finalPrompt = mergePromptForAiml(enhancedPrompt, enhancedNegative);
    const genBody: Record<string, unknown> = {
      model,
      prompt: finalPrompt,
      n: 1,
    };

    log("aiml_generate_start", { job: label, model });
    const t0 = Date.now();
    const imageRes = await generateImageWithRetry(aiml, genBody, label, AIML_MAX_RETRIES, AIML_RETRY_DELAY_MS);
    log("aiml_generate_done", { job: label, ms: Date.now() - t0 });

    const first = imageRes.data?.[0];
    const imageUrl =
      first?.url ?? (first?.b64_json ? `data:image/png;base64,${first.b64_json}` : null);
    if (!imageUrl || typeof imageUrl !== "string") {
      throw new Error("Image generation returned no URL/b64_json");
    }
    entry.imageUrl = imageUrl.startsWith("data:") ? "(inline base64)" : imageUrl;

    log("fetch_image_buffer_start", { job: label });
    const { buffer, mimeType } = await fetchImageAsBuffer(imageUrl, TRIPO_CONFIG.PROXY_MAX_BYTES);
    const ext = mimeType === "image/jpeg" ? "jpg" : "png";
    const imageFilename = `reference.${ext}`;
    const imagePath = path.join(job.outDir, imageFilename);
    await writeFile(imagePath, buffer);
    entry.imagePath = path.relative(assetsRoot, imagePath).replace(/\\/g, "/");
    log("write_image_done", { job: label, path: entry.imagePath });

    // --- Tripo mesh ---
    log("tripo_upload_start", { job: label });
    const upload = await tripo.uploadFile(
      buffer,
      imageFilename,
      mimeType === "image/jpeg" ? "image/jpeg" : "image/png",
    );
    const fileToken = extractTripoUploadToken(upload);

    const imgType = mimeType === "image/jpeg" ? "jpg" : "png";
    const { createTaskResponse: meshCreated } = await tripo.createTask({
      type: "image_to_model",
      file: { type: imgType, file_token: fileToken },
      model_version: TRIPO_MODEL_VERSION,
      texture: true,
      pbr: true,
    } as never);

    const meshTaskId = meshCreated.data.task_id;
    if (!meshTaskId) throw new Error("Tripo did not return mesh task_id");
    entry.meshTaskId = meshTaskId;
    log("tripo_mesh_task_created", { job: label, meshTaskId });

    const meshTask = await tripo.pollTask(meshTaskId, TRIPO_POLL);
    const glbUrl =
      meshTask.output?.pbr_model ?? meshTask.output?.model ?? meshTask.output?.base_model;
    if (!glbUrl || typeof glbUrl !== "string") {
      throw new Error("Mesh task succeeded but no GLB URL in output");
    }
    entry.modelUrl = glbUrl;

    const glbPath = path.join(job.outDir, "mesh.glb");
    await downloadToFile(glbUrl, glbPath);
    entry.glbPath = path.relative(assetsRoot, glbPath).replace(/\\/g, "/");

    log("job_success", { job: label, imagePath: entry.imagePath, glbPath: entry.glbPath });
  } catch (e) {
    entry.error = e instanceof Error ? e.message : String(e);
    log("job_failed", { job: label, error: entry.error });
  }

  return entry;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const concurrency = Math.max(1, Number.parseInt(process.argv[2] ?? "2", 10) || 2);

  const apiRoot = path.join(__dirname, "../..");
  const assetsRoot = path.join(apiRoot, "assets");
  const figuresJsonPath = path.join(assetsRoot, "figures.json");
  const figuresOutDir = path.join(assetsRoot, "figures");
  const manifestPath = path.join(assetsRoot, "figures-generation-manifest.json");

  log("load_figures_json", { path: figuresJsonPath });
  const figures = JSON.parse(await readFile(figuresJsonPath, "utf8")) as Figure[];
  log("figures_loaded", { count: figures.length });

  await mkdir(figuresOutDir, { recursive: true });

  const jobs = buildJobs(figures, figuresOutDir, assetsRoot);
  log("jobs_built", {
    totalJobs: jobs.length,
    concurrency,
    note: "Each job generates one image + one GLB mesh for a figure/skin/variant combination.",
  });

  const aiml = new AimlApiService();
  const tripo = new TripoService();

  const t0 = Date.now();
  const entries = await mapPool(jobs, concurrency, (job) =>
    processJob(job, aiml, tripo, assetsRoot),
  );
  log("all_jobs_done", { ms: Date.now() - t0, total: entries.length });

  const successful = entries.filter((e) => !e.error);
  const failed = entries.filter((e) => e.error);

  const manifest = {
    generatedAt: new Date().toISOString(),
    totalJobs: entries.length,
    successful: successful.length,
    failed: failed.length,
    entries,
  };

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  log("manifest_written", { path: manifestPath });

  console.log("\n--- Generation summary ---");
  console.log(`  Total jobs : ${entries.length}`);
  console.log(`  Successful : ${successful.length}`);
  console.log(`  Failed     : ${failed.length}`);
  if (failed.length) {
    console.log("\n  Failed jobs:");
    for (const e of failed) {
      console.log(`    - ${e.figureName}/${e.skinLabel}/variant-${e.variantLetter}: ${e.error}`);
    }
  }
  console.log("---\n");
}

main().catch((e) => {
  log("fatal", { error: e instanceof Error ? e.message : String(e) });
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
