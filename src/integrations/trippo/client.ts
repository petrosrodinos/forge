import axios, { AxiosInstance, AxiosResponse, AxiosError } from "axios";
import { ErrorResponse } from "./types";

const BASE_URL = "https://api.tripo3d.ai/v2/openapi";

export function createHttpClient(apiKey: string): AxiosInstance {
  const client = axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  client.interceptors.response.use(
    (res: AxiosResponse) => res,
    (err: AxiosError<ErrorResponse>) => {
      const data = err.response?.data;
      const message = data?.message ?? err.message;
      const suggestion = data?.suggestion ?? "";
      const code = data?.code ?? err.response?.status ?? 0;
      throw Object.assign(new Error(`[${code}] ${message}${suggestion ? ` — ${suggestion}` : ""}`), {
        code,
        suggestion,
        status: err.response?.status,
      });
    }
  );

  return client;
}
