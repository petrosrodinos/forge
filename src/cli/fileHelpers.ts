import axios from "axios";
import path from "path";
import { mkdir, readFile, writeFile } from "fs/promises";

export function requiredString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing required string argument: ${key}`);
  }
  return value;
}

export function optionalString(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error(`Argument must be string: ${key}`);
  return value;
}

export function defaultAudioExt(format: unknown): string {
  if (typeof format === "string" && format) return format;
  return "mp3";
}

export function inferMimeTypeFromPath(filePath: string): "image/png" | "image/jpeg" {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  throw new Error("Unsupported file extension for upload. Use .png, .jpg, or .jpeg");
}

export function resolvePath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

export async function readLocalFile(filePath: string): Promise<{ absolutePath: string; data: Buffer }> {
  const absolutePath = resolvePath(filePath);
  const data = await readFile(absolutePath);
  return { absolutePath, data };
}

export async function writeBufferToPath(buffer: Buffer, outputPath: string): Promise<string> {
  const absolutePath = resolvePath(outputPath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);
  return absolutePath;
}

export async function saveImageFromUrl(url: string, outputPath: string): Promise<string> {
  const res = await axios.get<ArrayBuffer>(url, { responseType: "arraybuffer" });
  return writeBufferToPath(Buffer.from(res.data), outputPath);
}
