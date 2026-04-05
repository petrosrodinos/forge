import { AxiosInstance } from "axios";
import FormData from "form-data";
import { Readable } from "stream";
import type { AxiosResponse } from "axios";
import { createHttpClient } from "./client";
import { requireEnv } from "../../config/env";
import type { Prisma } from "../../generated/prisma/client";
import { buildTrippoCostsMetadata } from "../../lib/provider-costs-metadata";
import {
  CreateTaskRequest,
  CreateTaskResponse,
  GetStsTokenResponse,
  ImageFormat,
  SuccessResponse,
  Task,
  Balance,
} from "./types";

export class TripoService {
  private readonly http: AxiosInstance;

  constructor(apiKey: string = requireEnv("TRIPO_API_KEY")) {
    this.http = createHttpClient(apiKey);
  }

  // ── Tasks ────────────────────────────────────────────────────────────────

  async createTask(body: CreateTaskRequest): Promise<{
    createTaskResponse: CreateTaskResponse;
    costsMetadata: Prisma.InputJsonValue;
  }> {
    const res: AxiosResponse<CreateTaskResponse> = await this.http.post("/task", body);
    return { createTaskResponse: res.data, costsMetadata: buildTrippoCostsMetadata(res) };
  }

  async getTask(taskId: string): Promise<SuccessResponse<Task>> {
    const res = await this.http.get<SuccessResponse<Task>>(`/task/${taskId}`);
    return res.data;
  }

  // ── Upload ───────────────────────────────────────────────────────────────

  async uploadFile(
    file: Buffer | Readable,
    filename: string,
    mimeType: "image/png" | "image/jpeg"
  ): Promise<SuccessResponse> {
    const form = new FormData();
    form.append("file", file, { filename, contentType: mimeType });

    const res = await this.http.post<SuccessResponse>("/upload", form, {
      headers: form.getHeaders(),
    });
    return res.data;
  }

  async getStsToken(format: ImageFormat): Promise<GetStsTokenResponse> {
    const res = await this.http.post<GetStsTokenResponse>("/upload/sts/token", { format });
    return res.data;
  }

  // ── User ─────────────────────────────────────────────────────────────────

  async getBalance(): Promise<SuccessResponse<Balance>> {
    const res = await this.http.get<SuccessResponse<Balance>>("/user/balance");
    return res.data;
  }

  // ── Polling helper ───────────────────────────────────────────────────────

  async pollTask(
    taskId: string,
    opts: { intervalMs?: number; timeoutMs?: number } = {}
  ): Promise<Task> {
    const { intervalMs = 2000, timeoutMs = 300_000 } = opts;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const { data: task } = await this.getTask(taskId);

      if (task.status === "success") return task;
      if (["failed", "cancelled", "banned", "expired"].includes(task.status)) {
        throw new Error(`Task ${taskId} ended with status "${task.status}": ${task.error_msg ?? ""}`);
      }

      await sleep(intervalMs);
    }

    throw new Error(`Task ${taskId} timed out after ${timeoutMs}ms`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
