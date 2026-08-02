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
  CreateTaskType,
  GetStsTokenResponse,
  ImageFormat,
  SuccessResponse,
  Task,
  Balance,
} from "./types";

const TASK_TYPE_TO_PATH: Record<CreateTaskType, string> = {
  text_to_model: "/generation/text-to-model",
  image_to_model: "/generation/image-to-model",
  multiview_to_model: "/generation/multiview-to-model",
  text_to_image: "/generation/text-to-image",
  texture_model: "/models/texture",
  refine_model: "/models/refine",
  stylize_model: "/models/stylize",
  convert_model: "/models/convert",
  animate_prerigcheck: "/animations/rig-check",
  animate_rig: "/animations/rig",
  animate_retarget: "/animations/retarget",
  mesh_segmentation: "/mesh/segment",
  mesh_completion: "/mesh/complete",
  highpoly_to_lowpoly: "/mesh/decimate",
};

const RETIRED_MODEL_VERSIONS: Record<string, string> = {
  "v1.3-20240522": "v2.5-20250123",
  "v1.4-20240625": "v2.5-20250123",
  "v2.0-20240919": "v2.5-20250123",
  "Turbo-v1.0-20250506": "v2.5-20250123",
  "v2.5-20260210": "v2.5-20250123",
  default: "v2.5-20250123",
};

const RIG_VERSION_TRANSLATE: Record<string, string> = {
  "v2.0-20250506": "v2.5-20260210",
};

const P1_FORBIDDEN_KEYS = [
  "geometry_quality",
  "quad",
  "smart_low_poly",
  "generate_parts",
] as const;

const MULTIVIEW_VIEWS = ["front", "left", "back", "right"] as const;

function fileToInputToken(file: unknown): string | null {
  if (!file || typeof file !== "object") return null;
  const f = file as Record<string, unknown>;
  if (typeof f.file_token === "string" && f.file_token) return f.file_token;
  if (typeof f.url === "string" && f.url) return f.url;
  return null;
}

function normalizeCreateBody(body: CreateTaskRequest): Record<string, unknown> {
  const { type, ...rest } = body;
  const payload: Record<string, unknown> = { ...rest };

  if (typeof payload.model === "string" && payload.model_version == null) {
    payload.model_version = payload.model;
  }

  if (typeof payload.model_version === "string") {
    if (type === "animate_rig") {
      payload.model_version =
        RIG_VERSION_TRANSLATE[payload.model_version] ?? payload.model_version;
    } else if (type === "highpoly_to_lowpoly" || type === "text_to_image") {
      delete payload.model_version;
      delete payload.model;
    } else {
      payload.model_version =
        RETIRED_MODEL_VERSIONS[payload.model_version] ?? payload.model_version;
    }
  }

  if (type === "texture_model" && payload.model_version == null) {
    payload.model_version = "v2.5-20250123";
  }

  if (
    (type === "text_to_model" || type === "image_to_model" || type === "multiview_to_model") &&
    payload.model_version == null
  ) {
    payload.model_version = "v3.1-20260211";
  }

  if (
    (type === "text_to_model" || type === "image_to_model" || type === "multiview_to_model") &&
    typeof payload.model_version === "string"
  ) {
    payload.model = payload.model_version;
  }

  if (type === "image_to_model") {
    if (payload.input == null && payload.file != null) {
      const token = fileToInputToken(payload.file);
      if (token) payload.input = token;
    }
    delete payload.file;
  }

  if (type === "multiview_to_model") {
    if (payload.inputs == null && Array.isArray(payload.files)) {
      const files = payload.files as unknown[];
      const inputs: Array<Record<string, string>> = [];
      for (let i = 0; i < Math.min(files.length, MULTIVIEW_VIEWS.length); i++) {
        const token = fileToInputToken(files[i]);
        if (!token) continue;
        inputs.push({ [MULTIVIEW_VIEWS[i]]: token });
      }
      payload.inputs = inputs;
    }
    delete payload.files;
  }

  const modelId = String(payload.model ?? payload.model_version ?? "");
  if (modelId.startsWith("P")) {
    for (const key of P1_FORBIDDEN_KEYS) delete payload[key];
  }
  if (modelId === "v2.5-20250123") {
    delete payload.geometry_quality;
  }

  if (
    typeof (payload as { rough_model_task_id?: unknown }).rough_model_task_id === "string" &&
    payload.draft_model_task_id == null
  ) {
    payload.draft_model_task_id = (payload as { rough_model_task_id: string }).rough_model_task_id;
    delete (payload as { rough_model_task_id?: string }).rough_model_task_id;
  }

  delete payload.enable_audit;
  return payload;
}

export class TripoService {
  private readonly http: AxiosInstance;

  constructor(apiKey: string = requireEnv("TRIPO_API_KEY")) {
    this.http = createHttpClient(apiKey);
  }

  async createTask(body: CreateTaskRequest): Promise<{
    createTaskResponse: CreateTaskResponse;
    costsMetadata: Prisma.InputJsonValue;
  }> {
    const path = TASK_TYPE_TO_PATH[body.type];
    if (!path) {
      throw new Error(`Unsupported Tripo task type for V3: ${String(body.type)}`);
    }
    const payload = normalizeCreateBody(body);
    const res: AxiosResponse<CreateTaskResponse> = await this.http.post(path, payload);
    return { createTaskResponse: res.data, costsMetadata: buildTrippoCostsMetadata(res) };
  }

  async getTask(taskId: string): Promise<SuccessResponse<Task>> {
    const res = await this.http.get<SuccessResponse<Task>>(`/tasks/${taskId}`);
    return res.data;
  }

  async uploadFile(
    file: Buffer | Readable,
    filename: string,
    mimeType: "image/png" | "image/jpeg"
  ): Promise<SuccessResponse> {
    const form = new FormData();
    form.append("file", file, { filename, contentType: mimeType });

    const res = await this.http.post<SuccessResponse>("/files", form, {
      headers: form.getHeaders(),
    });
    return res.data;
  }

  async getStsToken(format: ImageFormat): Promise<GetStsTokenResponse> {
    const res = await this.http.post<GetStsTokenResponse>("/files/upload-credentials", { format });
    return res.data;
  }

  async getBalance(): Promise<SuccessResponse<Balance>> {
    const res = await this.http.get<SuccessResponse<Balance>>("/account/balance");
    return res.data;
  }

  async pollTask(
    taskId: string,
    opts: { intervalMs?: number; timeoutMs?: number } = {}
  ): Promise<Task> {
    const { intervalMs = 2000, timeoutMs = 300_000 } = opts;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const { data: task } = await this.getTask(taskId);

      if (task.status === "success") return task;
      if (task.status === "failed" || task.status === "cancelled") {
        const detail =
          task.error_message ?? (task.error_code != null ? `error_code ${task.error_code}` : "");
        throw new Error(`Task ${taskId} ended with status "${task.status}": ${detail}`);
      }
      if (!["queued", "running"].includes(task.status)) {
        const detail = task.error_message ?? "";
        throw new Error(`Task ${taskId} ended with status "${task.status}": ${detail}`);
      }

      await sleep(intervalMs);
    }

    throw new Error(`Task ${taskId} timed out after ${timeoutMs}ms`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
