/**
 * Tripo POST /upload body: { code, data?: { file_token | image_token }, message? }.
 * Some API versions use `image_token`; non-zero `code` means failure.
 */
export function extractTripoUploadToken(body: unknown): string {
  const res = body as { code?: number; data?: unknown; message?: string };
  if (typeof res.code === "number" && res.code !== 0) {
    const msg = res.message?.trim();
    throw new Error(msg || `Tripo upload failed (code ${res.code})`);
  }
  const d = (res.data ?? {}) as Record<string, unknown>;
  const t = d.file_token ?? d.image_token;
  if (typeof t === "string" && t.length > 0) return t;
  const keys = d && typeof d === "object" ? Object.keys(d).join(",") : "";
  throw new Error(
    `Tripo upload missing file_token/image_token (code=${res.code ?? "?"}, data keys: ${keys || "none"})`
  );
}
