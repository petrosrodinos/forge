import { AxiosInstance } from "axios";
import FormData from "form-data";
import { Readable } from "stream";
import { createAimlHttpClient } from "./client";
import { requireEnv } from "../../config/env";
import {
  ApiKeyItem,
  BatchRequestItem,
  BatchResponse,
  BillingBalance,
  ChatCompletionRequest,
  ChatCompletionResponse,
  CreateApiKeyRequest,
  EmbeddingRequest,
  EmbeddingResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ModelsListResponse,
  ResponsesRequest,
  ResponsesResponse,
  SttCreateResponse,
  SttResultResponse,
  TextToSpeechRequest,
  VideoGenerationRequest,
  VideoGenerationResponse,
} from "./types";

export class AimlApiService {
  private readonly http: AxiosInstance;

  constructor(apiKey: string = requireEnv("AIML_API_KEY")) {
    this.http = createAimlHttpClient(apiKey);
  }

  // ── Chat completions ────────────────────────────────────────────────────────

  async chatCompletion(body: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const res = await this.http.post<ChatCompletionResponse>("/v1/chat/completions", {
      ...body,
      stream: false,
    });
    return res.data;
  }

  /**
   * Returns a raw ReadableStream of SSE chunks.
   * Iterate with a library like `eventsource-parser` or consume `res.data` directly.
   */
  async chatCompletionStream(body: ChatCompletionRequest): Promise<Readable> {
    const res = await this.http.post<Readable>("/v1/chat/completions", {
      ...body,
      stream: true,
    }, { responseType: "stream" });
    return res.data;
  }

  // ── Responses (modern unified endpoint) ─────────────────────────────────────

  async responses(body: ResponsesRequest): Promise<ResponsesResponse> {
    const res = await this.http.post<ResponsesResponse>("/v1/responses", body);
    return res.data;
  }

  // ── Models ──────────────────────────────────────────────────────────────────

  async listModels(): Promise<ModelsListResponse> {
    const res = await this.http.get<ModelsListResponse>("/v1/models");
    return res.data;
  }

  // ── Image generation ────────────────────────────────────────────────────────

  async generateImage(body: ImageGenerationRequest | Record<string, unknown>): Promise<ImageGenerationResponse> {
    const res = await this.http.post<ImageGenerationResponse>("/v1/images/generations", body);
    return res.data;
  }

  // ── Video generation ────────────────────────────────────────────────────────

  async createVideoGeneration(body: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    const res = await this.http.post<VideoGenerationResponse>("/v2/video/generations", body);
    return res.data;
  }

  async getVideoGeneration(generationId: string): Promise<VideoGenerationResponse> {
    const res = await this.http.get<VideoGenerationResponse>("/v2/video/generations", {
      params: { generation_id: generationId },
    });
    return res.data;
  }

  async pollVideoGeneration(
    generationId: string,
    opts: { intervalMs?: number; timeoutMs?: number } = {}
  ): Promise<VideoGenerationResponse> {
    const { intervalMs = 10_000, timeoutMs = 300_000 } = opts;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const result = await this.getVideoGeneration(generationId);
      if (result.status === "completed") return result;
      if (result.status === "failed" || result.status === "canceled") {
        throw new Error(`Video generation ${generationId} ended with status "${result.status}"`);
      }
      await sleep(intervalMs);
    }

    throw new Error(`Video generation ${generationId} timed out after ${timeoutMs}ms`);
  }

  // ── Text-to-speech ──────────────────────────────────────────────────────────

  /** Returns the raw audio as a Buffer. */
  async textToSpeech(body: TextToSpeechRequest): Promise<Buffer> {
    const res = await this.http.post("/v1/audio/speech", body, {
      responseType: "arraybuffer",
    });
    return Buffer.from(res.data as ArrayBuffer);
  }

  // ── Speech-to-text ──────────────────────────────────────────────────────────

  async createTranscriptionFromUrl(model: string, audioUrl: string): Promise<SttCreateResponse> {
    const res = await this.http.post<SttCreateResponse>("/v1/audio/transcriptions", {
      model,
      audio_url: audioUrl,
    });
    return res.data;
  }

  async createTranscriptionFromFile(
    model: string,
    file: Buffer | Readable,
    filename: string
  ): Promise<SttCreateResponse> {
    const form = new FormData();
    form.append("model", model);
    form.append("file", file, { filename });

    const res = await this.http.post<SttCreateResponse>("/v1/audio/transcriptions", form, {
      headers: form.getHeaders(),
    });
    return res.data;
  }

  async getTranscription(generationId: string): Promise<SttResultResponse> {
    const res = await this.http.get<SttResultResponse>(`/v1/stt/${generationId}`);
    return res.data;
  }

  async pollTranscription(
    generationId: string,
    opts: { intervalMs?: number; timeoutMs?: number } = {}
  ): Promise<SttResultResponse> {
    const { intervalMs = 10_000, timeoutMs = 120_000 } = opts;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const result = await this.getTranscription(generationId);
      if (result.status === "completed") return result;
      if (result.status === "failed") {
        throw new Error(`Transcription ${generationId} failed`);
      }
      await sleep(intervalMs);
    }

    throw new Error(`Transcription ${generationId} timed out after ${timeoutMs}ms`);
  }

  // ── Embeddings ──────────────────────────────────────────────────────────────

  async createEmbedding(body: EmbeddingRequest): Promise<EmbeddingResponse> {
    const res = await this.http.post<EmbeddingResponse>("/v1/embeddings", body);
    return res.data;
  }

  // ── Batch ───────────────────────────────────────────────────────────────────

  async createBatch(requests: BatchRequestItem[]): Promise<BatchResponse> {
    const res = await this.http.post<BatchResponse>("/v1/batches", { requests });
    return res.data;
  }

  async getBatch(batchId: string): Promise<BatchResponse> {
    const res = await this.http.get<BatchResponse>("/v1/batches", {
      params: { batch_id: batchId },
    });
    return res.data;
  }

  async cancelBatch(batchId: string): Promise<void> {
    await this.http.post(`/v1/batches/cancel/${batchId}`);
  }

  // ── Billing ─────────────────────────────────────────────────────────────────

  async getBalance(): Promise<BillingBalance> {
    const res = await this.http.get<BillingBalance>("/v1/billing/balance");
    return res.data;
  }

  // ── API key management ──────────────────────────────────────────────────────

  async createApiKey(body: CreateApiKeyRequest): Promise<ApiKeyItem> {
    const res = await this.http.post<ApiKeyItem>("/v1/keys", body);
    return res.data;
  }

  async listApiKeys(): Promise<ApiKeyItem[]> {
    const res = await this.http.get<ApiKeyItem[]>("/v1/keys");
    return res.data;
  }

  async getCurrentKey(): Promise<ApiKeyItem> {
    const res = await this.http.get<ApiKeyItem>("/v1/key");
    return res.data;
  }

  async updateApiKey(prefix: string, updates: Partial<CreateApiKeyRequest & { status: "active" | "disabled" }>): Promise<ApiKeyItem> {
    const res = await this.http.patch<ApiKeyItem>(`/v1/keys/${prefix}`, updates);
    return res.data;
  }

  async deleteApiKey(prefix: string): Promise<void> {
    await this.http.delete(`/v1/keys/${prefix}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
