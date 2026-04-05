import type { AxiosResponse } from "axios";
import type { Prisma } from "../generated/prisma/client";
import type { ImageGenerationResponse, UsageStats } from "../integrations/aimlapi/types";

function pickRelevantResponseHeaders(headers: AxiosResponse["headers"]): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers || typeof headers !== "object") return out;
  for (const [rawKey, value] of Object.entries(headers)) {
    if (value == null) continue;
    const lk = rawKey.toLowerCase();
    const str = Array.isArray(value) ? value.join(", ") : String(value);
    if (str.length > 2_048) continue;
    if (
      lk.includes("request-id") ||
      lk.includes("correlation") ||
      lk.includes("ratelimit") ||
      lk.includes("usage") ||
      lk.includes("cost") ||
      lk.includes("billing") ||
      lk === "cf-ray" ||
      lk.startsWith("x-aiml")
    ) {
      out[rawKey] = str;
    }
  }
  return out;
}

/** Snapshot of AimlAPI image generation response for cost reconciliation (no image payloads). */
export function buildAimlImageGenerationCostsMetadata(
  res: AxiosResponse<ImageGenerationResponse & { usage?: UsageStats }>,
): Prisma.InputJsonValue {
  const body = res.data as unknown as Record<string, unknown>;
  const slim: Record<string, unknown> = {
    provider: "aimlapi",
    endpoint: "v1/images/generations",
  };
  if (body.usage != null) slim.usage = body.usage;
  if (typeof body.created === "number") slim.created = body.created;
  if (Array.isArray(body.data)) {
    slim.resultsCount = body.data.length;
    slim.resultKinds = (body.data as Array<{ url?: string; b64_json?: string }>).map((d) =>
      d?.b64_json ? "b64_json" : d?.url ? "url" : "unknown",
    );
  }
  const headers = pickRelevantResponseHeaders(res.headers);
  if (Object.keys(headers).length) slim.responseHeaders = headers;
  return slim as Prisma.InputJsonValue;
}

/** Snapshot of Tripo OpenAPI response (body + selected headers). */
export function buildTrippoCostsMetadata(res: AxiosResponse): Prisma.InputJsonValue {
  const slim: Record<string, unknown> = { provider: "trippo" };
  try {
    slim.responseBody = JSON.parse(JSON.stringify(res.data)) as unknown;
  } catch {
    slim.responseBody = "[unserializable]";
  }
  const headers = pickRelevantResponseHeaders(res.headers);
  if (Object.keys(headers).length) slim.responseHeaders = headers;
  return slim as Prisma.InputJsonValue;
}

export function usageMetadataWithProviderCosts(
  costs: Prisma.InputJsonValue,
  provider: "aimlapi" | "trippo",
): Prisma.InputJsonValue {
  return {
    providerCosts: {
      [provider]: costs,
    },
  } as Prisma.InputJsonValue;
}
