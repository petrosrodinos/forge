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

  client.interceptors.response.use(
    (res: AxiosResponse) => res,
    (err: AxiosError<AimlApiError>) => {
      const data = err.response?.data;
      const message = data?.message ?? err.message;
      const statusCode = data?.statusCode ?? err.response?.status ?? 0;
      const requestId = data?.requestId ?? "";
      throw Object.assign(
        new Error(`[${statusCode}] ${message}${requestId ? ` (requestId: ${requestId})` : ""}`),
        { statusCode, requestId, path: data?.path }
      );
    }
  );

  return client;
}
