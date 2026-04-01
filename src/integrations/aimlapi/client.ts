import axios, { AxiosInstance, AxiosResponse, AxiosError } from "axios";
import { AimlApiError } from "./types";

const BASE_URL = "https://api.aimlapi.com";

export function createAimlHttpClient(apiKey: string): AxiosInstance {
  const client = axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
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
    (err: AxiosError<AimlApiError>) => {
      const data = err.response?.data;
      const message = data?.message ?? err.message;
      const statusCode = data?.statusCode ?? err.response?.status ?? 0;
      const requestId = data?.requestId ?? "";
      const apiError = Object.assign(
        new Error(`[${statusCode}] ${message}${requestId ? ` (requestId: ${requestId})` : ""}`),
        { statusCode, requestId, path: data?.path, rawData: data }
      );
      console.error("[AIML API Error]", JSON.stringify({ statusCode, message, requestId, rawData: data }, null, 2));
      throw apiError;
    }
  );

  return client;
}
