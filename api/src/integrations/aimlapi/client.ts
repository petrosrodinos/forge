import axios, { AxiosInstance, AxiosResponse, AxiosError } from "axios";
import { AimlApiError } from "./types";
import { AIML_CONFIG } from "./config/aiml.config";

const BASE_URL = "https://api.aimlapi.com";

function isHtmlPayload(data: unknown): boolean {
  return typeof data === "string" && (data.includes("<!DOCTYPE") || data.includes("<html"));
}

function buildAimlClientError(err: AxiosError<AimlApiError | string>): Error {
  const httpStatus = err.response?.status ?? 0;
  const raw = err.response?.data;
  const json = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as AimlApiError) : null;
  const requestId = json?.requestId ?? "";
  let message = json?.message ?? err.message;
  let clientStatus = httpStatus || 502;

  if (err.code === "ECONNABORTED" || /timeout/i.test(err.message)) {
    message =
      "The AI provider request timed out. Try again in a moment.";
    clientStatus = 503;
  } else if (httpStatus === 524 || httpStatus === 504) {
    message =
      "The AI provider took too long to respond (upstream timeout). Please try again in a moment.";
    clientStatus = 503;
  } else if (httpStatus === 502 || httpStatus === 503) {
    message = "The AI provider is temporarily unavailable. Please try again.";
    clientStatus = 503;
  } else if (isHtmlPayload(raw)) {
    message =
      httpStatus === 524
        ? "The AI provider timed out (Cloudflare 524). Please try again."
        : `The AI provider returned an error (HTTP ${httpStatus}). Please try again.`;
    clientStatus = httpStatus === 524 ? 503 : clientStatus >= 400 ? clientStatus : 502;
  } else if (json?.message) {
    message = `[AIML ${httpStatus || "error"}] ${json.message}${requestId ? ` (requestId: ${requestId})` : ""}`;
  }

  const logPayload =
    typeof raw === "string" && raw.length > 500
      ? `${raw.slice(0, 500)}… (${raw.length} chars)`
      : raw;

  const apiError = Object.assign(new Error(message), {
    status: clientStatus,
    statusCode: clientStatus,
    upstreamStatus: httpStatus,
    requestId,
    path: json?.path,
    rawData: logPayload,
  });
  return apiError;
}

export function createAimlHttpClient(apiKey: string): AxiosInstance {
  const client = axios.create({
    baseURL: BASE_URL,
    timeout: AIML_CONFIG.HTTP_TIMEOUT_MS,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  client.interceptors.request.use((config) => {
    if (config.data?.tools) {
      console.log("[AIML Request] model:", config.data.model, "tool_choice:", config.data.tool_choice);
      console.log("[AIML Request] tools:", JSON.stringify(config.data.tools, null, 2));
    }
    return config;
  });

  client.interceptors.response.use(
    (res: AxiosResponse) => res,
    (err: AxiosError<AimlApiError | string>) => {
      const apiError = buildAimlClientError(err);
      const httpStatus = err.response?.status ?? 0;
      const raw = err.response?.data;
      console.error(
        "[AIML API Error]",
        JSON.stringify(
          {
            status: httpStatus,
            message: apiError.message,
            requestId: (apiError as Error & { requestId?: string }).requestId,
            rawPreview: typeof raw === "string" ? `${raw.slice(0, 200)}…` : raw,
          },
          null,
          2,
        ),
      );
      throw apiError;
    },
  );

  return client;
}
