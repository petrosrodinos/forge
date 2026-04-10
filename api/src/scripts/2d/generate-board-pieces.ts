import "dotenv/config";
import path from "path";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import { Jimp } from "jimp";
import sharp from "sharp";

import { build2dPrompt } from "./prompt-generation";
import { AimlApiService } from "../../integrations/aimlapi/AimlApiService";
import { buildAimlImageGenerationsBody } from "../../integrations/aimlapi/buildImageGenerationsBody";
import { fetchImageAsBuffer } from "../../lib/image-fetch.util";
import { ImageModels } from "../../config/models/image-models";

type ThemeName = "white" | "black";
type VariantName = "default";

type FigureConfig = {
  generate?: boolean;
  themes?: {
    white?: boolean;
    black?: boolean;
    dark?: boolean;
  };
  variants?: Record<string, boolean>;
};

type GenerationConfig = Record<string, FigureConfig>;

type ImageEntry = {
  theme: ThemeName;
  variant: VariantName;
  prompt: string;
  file: string;
  cost: number;
  durationMs: number;
};

type ImageJob = {
  theme: ThemeName;
  variant: VariantName;
  prompt: string;
  outputFileName: string;
  outputPath: string;
  sourceImageDataUrl: string;
};

const FIGURES_ROOT = path.resolve(__dirname, "./figures");
const CONFIG_PATH = path.resolve(__dirname, "./generation.config.json");
const IMAGE_VARIANT: VariantName = "default";
const PER_FIGURE_CONCURRENCY = 2;
const FIGURE_PARALLEL_BATCH_SIZE = 5;
const COST_FALLBACK_TO_CATALOG = true;
const AIML_MAX_RETRIES = 4;
const AIML_BASE_RETRY_DELAY_MS = 1500;
const ENABLE_BACKGROUND_REMOVAL = false;

function toFsSafeTimestamp(date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "").replace(/:/g, "-");
}

function imageMimeFromFilename(filename: string): "image/png" | "image/jpeg" {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "image/png";
}

async function ensureMinImageDimensions(
  input: Buffer,
  minSize = 64,
): Promise<{ buffer: Buffer; wasResized: boolean }> {
  const image = await Jimp.read(input);
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  if (width >= minSize && height >= minSize) {
    return { buffer: input, wasResized: false };
  }

  const scale = Math.max(minSize / width, minSize / height);
  const outW = Math.max(minSize, Math.ceil(width * scale));
  const outH = Math.max(minSize, Math.ceil(height * scale));
  image.resize({ w: outW, h: outH });
  const out = await image.getBuffer("image/png");
  return { buffer: out, wasResized: true };
}

async function removeImageBackground(input: Buffer): Promise<Buffer> {
  try {
    const image = sharp(input, { failOn: "none" });
    const meta = await image.metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (width < 2 || height < 2) return input;

    const rgba = await image.ensureAlpha().raw().toBuffer();
    const stride = 4;
    const idx = (x: number, y: number) => (y * width + x) * stride;

    // Estimate background color from corners.
    const corners = [
      idx(0, 0),
      idx(width - 1, 0),
      idx(0, height - 1),
      idx(width - 1, height - 1),
    ];
    const avg = corners.reduce(
      (acc, i) => {
        acc.r += rgba[i];
        acc.g += rgba[i + 1];
        acc.b += rgba[i + 2];
        return acc;
      },
      { r: 0, g: 0, b: 0 },
    );
    const bg = {
      r: avg.r / corners.length,
      g: avg.g / corners.length,
      b: avg.b / corners.length,
    };

    // Make near-background pixels transparent.
    const tolerance = 48;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = idx(x, y);
        const dr = rgba[i] - bg.r;
        const dg = rgba[i + 1] - bg.g;
        const db = rgba[i + 2] - bg.b;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);
        if (dist <= tolerance) rgba[i + 3] = 0;
      }
    }

    return await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error && err.stack ? err.stack.split("\n").slice(0, 3).join(" | ") : "no stack";
    console.warn(`[warn] background removal skipped (sharp): ${msg}; bytes=${input.length}; stack=${stack}`);
    return input;
  }
}

function parseNumberLoose(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const m = /-?\d+(\.\d+)?/.exec(value);
    if (!m) return null;
    const n = Number.parseFloat(m[0]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function isRetryableAimlError(err: unknown): boolean {
  const msg = getErrorMessage(err).toLowerCase();
  return (
    msg.includes("socket hang up") ||
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("[aiml 429]") ||
    msg.includes("[aiml 500]") ||
    msg.includes("[aiml 502]") ||
    msg.includes("[aiml 503]") ||
    msg.includes("[aiml 504]")
  );
}

function retryDelayMs(attempt: number): number {
  const base = AIML_BASE_RETRY_DELAY_MS * 2 ** (attempt - 1);
  const jitter = Math.floor(Math.random() * 500);
  return Math.min(15_000, base + jitter);
}

function extractCostFromMetadata(costsMetadata: unknown): number | null {
  if (!costsMetadata || typeof costsMetadata !== "object") return null;
  const root = costsMetadata as Record<string, unknown>;

  const directPaths: unknown[] = [
    root.total_cost,
    root.cost,
    root.price,
    root.usage && (root.usage as Record<string, unknown>).total_cost,
    root.usage && (root.usage as Record<string, unknown>).cost,
  ];

  for (const candidate of directPaths) {
    const n = parseNumberLoose(candidate);
    if (n != null && n >= 0) return n;
  }

  const headers = root.responseHeaders;
  if (headers && typeof headers === "object") {
    for (const [k, v] of Object.entries(headers as Record<string, unknown>)) {
      const lk = k.toLowerCase();
      if (lk.includes("cost") || lk.includes("price") || lk.includes("billing")) {
        const n = parseNumberLoose(v);
        if (n != null && n >= 0) return n;
      }
    }
  }

  return null;
}

function pickBestImageToImageModelPreferOpenAi(): { id: string; price_original: number } {
  // Prefer OpenAI's best model explicitly when available.
  // Some catalog rows are not marked as image-to-image even though edits work in practice.
  const gptImage1 = ImageModels.find((m) => m.available && m.id === "gpt-image-1");
  if (gptImage1) {
    return { id: gptImage1.id, price_original: gptImage1.price_original };
  }

  const openAiI2i = ImageModels.filter(
    (m) => m.available && m.is_image_to_image && m.provider.toLowerCase() === "openai",
  );
  if (openAiI2i.length) {
    const bestOpenAi = openAiI2i.reduce((acc, cur) =>
      cur.price_original > acc.price_original ? cur : acc,
    );
    return { id: bestOpenAi.id, price_original: bestOpenAi.price_original };
  }

  const anyI2i = ImageModels.filter((m) => m.available && m.is_image_to_image);
  if (!anyI2i.length) {
    throw new Error("No available image-to-image model found in ImageModels");
  }
  const bestAny = anyI2i.reduce((acc, cur) =>
    cur.price_original > acc.price_original ? cur : acc,
  );
  console.warn(
    `[warn] no OpenAI image-to-image model configured; using ${bestAny.id} (${bestAny.provider})`,
  );
  return { id: bestAny.id, price_original: bestAny.price_original };
}

async function readGenerationConfig(): Promise<GenerationConfig> {
  const raw = await readFile(CONFIG_PATH, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("generation.config.json must be an object keyed by figure name");
  }
  return parsed as GenerationConfig;
}

async function readSourceImageDataUrl(figureDir: string): Promise<{ dataUrl: string; sourceFileName: string }> {
  const dirents = await readdir(figureDir, { withFileTypes: true });
  const files = dirents
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .filter((name) => /\.(png|jpg|jpeg)$/i.test(name))
    .sort((a, b) => a.localeCompare(b));

  const preferred = files.find((name) => /-original\.(png|jpg|jpeg)$/i.test(name));
  if (!preferred) {
    throw new Error(`Missing original source image in ${figureDir}. Expected a file ending with "-original.(png|jpg|jpeg)"`);
  }

  const abs = path.join(figureDir, preferred);
  const buf = await readFile(abs);
  const mime = imageMimeFromFilename(preferred);
  const normalized = await ensureMinImageDimensions(buf, 64);
  const outputMime = normalized.wasResized ? "image/png" : mime;
  return {
    dataUrl: `data:${outputMime};base64,${normalized.buffer.toString("base64")}`,
    sourceFileName: preferred,
  };
}

function enabledThemesForFigure(cfg: FigureConfig | undefined): ThemeName[] {
  const whiteEnabled = cfg?.themes?.white ?? true;
  const blackEnabled = (cfg?.themes?.black ?? false) || (cfg?.themes?.dark ?? false);
  return (["white", "black"] as ThemeName[]).filter((theme) =>
    theme === "white" ? whiteEnabled : blackEnabled,
  );
}

function isDefaultVariantEnabled(cfg: FigureConfig | undefined): boolean {
  if (!cfg?.variants) return true;
  return cfg.variants.default !== false;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!items.length) return [];
  const c = Math.max(1, Math.min(items.length, Math.floor(concurrency)));
  const out = new Array<R>(items.length);
  let next = 0;

  async function runOne(): Promise<void> {
    for (;;) {
      const idx = next++;
      if (idx >= items.length) return;
      out[idx] = await worker(items[idx] as T, idx);
    }
  }

  await Promise.all(Array.from({ length: c }, () => runOne()));
  return out;
}

async function ensureUniqueGenerationDir(baseFigureDir: string, ts: string): Promise<string> {
  let attempt = 0;
  for (;;) {
    const suffix = attempt === 0 ? "" : `-${attempt}`;
    const dir = path.join(baseFigureDir, `generation-${ts}${suffix}`);
    try {
      await mkdir(dir, { recursive: false });
      return dir;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "EEXIST") {
        attempt += 1;
        continue;
      }
      throw err;
    }
  }
}

async function generateImageJob(
  aiml: AimlApiService,
  modelId: string,
  modelCatalogCost: number,
  job: ImageJob,
): Promise<ImageEntry> {
  const started = Date.now();
  const body = buildAimlImageGenerationsBody({
    internalModelId: modelId,
    prompt: job.prompt,
    sourceImageDataUrl: job.sourceImageDataUrl,
  });
  const hasI2iSource =
    typeof body.image === "string" ||
    typeof body.image_url === "string" ||
    (Array.isArray(body.image_urls) && body.image_urls.length > 0);
  if (!hasI2iSource) {
    throw new Error(`I2I source image was not attached for ${job.outputFileName}`);
  }

  let data: Awaited<ReturnType<AimlApiService["generateImage"]>>["data"] | null = null;
  let costsMetadata: Awaited<ReturnType<AimlApiService["generateImage"]>>["costsMetadata"] | null = null;
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= AIML_MAX_RETRIES; attempt++) {
    try {
      const res = await aiml.generateImage(body);
      data = res.data;
      costsMetadata = res.costsMetadata;
      break;
    } catch (err) {
      lastErr = err;
      const retryable = isRetryableAimlError(err);
      if (!retryable || attempt === AIML_MAX_RETRIES) {
        break;
      }
      const delay = retryDelayMs(attempt);
      console.warn(
        `[warn] image generation retry ${attempt}/${AIML_MAX_RETRIES - 1} for ${job.outputFileName}: ${getErrorMessage(err)}; waitMs=${delay}`,
      );
      await sleep(delay);
    }
  }
  if (!data || !costsMetadata) {
    throw new Error(`Failed image generation for ${job.outputFileName}: ${getErrorMessage(lastErr)}`);
  }

  const first = data.data?.[0];
  const imageUrl = first?.url ?? (first?.b64_json ? `data:image/png;base64,${first.b64_json}` : null);
  if (!imageUrl) throw new Error(`No image data returned for ${job.outputFileName}`);

  const { buffer } = await fetchImageAsBuffer(imageUrl);
  const finalBuffer = ENABLE_BACKGROUND_REMOVAL ? await removeImageBackground(buffer) : buffer;
  await writeFile(job.outputPath, finalBuffer);

  const actualCost = extractCostFromMetadata(costsMetadata);
  const cost = actualCost != null ? actualCost : COST_FALLBACK_TO_CATALOG ? modelCatalogCost : 0;

  return {
    theme: job.theme,
    variant: job.variant,
    prompt: job.prompt,
    file: job.outputFileName,
    cost,
    durationMs: Date.now() - started,
  };
}

async function processFigure(
  aiml: AimlApiService,
  model: { id: string; price_original: number },
  cfg: GenerationConfig,
  figureName: string,
  figureDir: string,
): Promise<{ generatedImages: number; totalCost: number }> {
  const figureCfg = cfg[figureName];
  if (figureCfg?.generate === false) {
    console.log(`[skip] ${figureName} (generate=false)`);
    return { generatedImages: 0, totalCost: 0 };
  }
  if (!isDefaultVariantEnabled(figureCfg)) {
    console.log(`[skip] ${figureName} (variants.default=false)`);
    return { generatedImages: 0, totalCost: 0 };
  }

  const themes = enabledThemesForFigure(figureCfg);
  if (!themes.length) {
    console.log(`[skip] ${figureName} (no enabled themes)`);
    return { generatedImages: 0, totalCost: 0 };
  }

  const runStarted = new Date();
  const runStartedMs = Date.now();
  const generationDir = await ensureUniqueGenerationDir(figureDir, toFsSafeTimestamp(runStarted));
  const sourceImage = await readSourceImageDataUrl(figureDir);
  console.log(`[source] ${figureName}: ${sourceImage.sourceFileName}`);

  const jobs: ImageJob[] = themes.map((theme) => {
    const prompt = build2dPrompt({ theme });
    const outputFileName = `${figureName}-${theme}-${IMAGE_VARIANT}.png`;
    return {
      theme,
      variant: IMAGE_VARIANT,
      prompt,
      outputFileName,
      outputPath: path.join(generationDir, outputFileName),
      sourceImageDataUrl: sourceImage.dataUrl,
    };
  });

  const images = await mapPool(jobs, PER_FIGURE_CONCURRENCY, (job) =>
    generateImageJob(aiml, model.id, model.price_original, job),
  );
  const figureTotalCost = images.reduce((sum, img) => sum + img.cost, 0);
  const durationMs = Date.now() - runStartedMs;
  console.log(
    `[ok] ${figureName} -> ${path.relative(FIGURES_ROOT, generationDir).replace(/\\/g, "/")} | images=${images.length} | cost=${figureTotalCost.toFixed(6)} | ms=${durationMs}`,
  );
  return { generatedImages: images.length, totalCost: figureTotalCost };
}

async function main(): Promise<void> {
  const cfg = await readGenerationConfig();
  const model = pickBestImageToImageModelPreferOpenAi();
  const aiml = new AimlApiService();

  const dirents = await readdir(FIGURES_ROOT, { withFileTypes: true });
  const figures = dirents
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));

  let totalGeneratedImages = 0;
  let totalCost = 0;
  for (let i = 0; i < figures.length; i += FIGURE_PARALLEL_BATCH_SIZE) {
    const batch = figures.slice(i, i + FIGURE_PARALLEL_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((figureName) => {
        const figureDir = path.join(FIGURES_ROOT, figureName);
        return processFigure(aiml, model, cfg, figureName, figureDir);
      }),
    );
    for (let idx = 0; idx < results.length; idx++) {
      const result = results[idx];
      const figureName = batch[idx]!;
      if (result.status === "fulfilled") {
        totalGeneratedImages += result.value.generatedImages;
        totalCost += result.value.totalCost;
      } else {
        console.error(`[error] figure failed (${figureName}): ${getErrorMessage(result.reason)}`);
      }
    }
  }

  console.log("---");
  console.log(`Total generated images: ${totalGeneratedImages}`);
  console.log(`Total cost: ${totalCost.toFixed(6)}`);
  const averageCostPerImage = totalGeneratedImages > 0 ? totalCost / totalGeneratedImages : 0;
  console.log(`Average cost per image: ${averageCostPerImage.toFixed(6)}`);
  console.log("---");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
