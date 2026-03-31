"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AimlApiService = void 0;
const form_data_1 = __importDefault(require("form-data"));
const client_1 = require("./client");
const env_1 = require("../env");
class AimlApiService {
    constructor(apiKey = (0, env_1.requireEnv)("AIML_API_KEY")) {
        this.http = (0, client_1.createAimlHttpClient)(apiKey);
    }
    // ── Chat completions ────────────────────────────────────────────────────────
    async chatCompletion(body) {
        const res = await this.http.post("/v1/chat/completions", {
            ...body,
            stream: false,
        });
        return res.data;
    }
    /**
     * Returns a raw ReadableStream of SSE chunks.
     * Iterate with a library like `eventsource-parser` or consume `res.data` directly.
     */
    async chatCompletionStream(body) {
        const res = await this.http.post("/v1/chat/completions", {
            ...body,
            stream: true,
        }, { responseType: "stream" });
        return res.data;
    }
    // ── Responses (modern unified endpoint) ─────────────────────────────────────
    async responses(body) {
        const res = await this.http.post("/v1/responses", body);
        return res.data;
    }
    // ── Models ──────────────────────────────────────────────────────────────────
    async listModels() {
        const res = await this.http.get("/v1/models");
        return res.data;
    }
    // ── Image generation ────────────────────────────────────────────────────────
    async generateImage(body) {
        const res = await this.http.post("/v1/images/generations", body);
        return res.data;
    }
    // ── Video generation ────────────────────────────────────────────────────────
    async createVideoGeneration(body) {
        const res = await this.http.post("/v2/video/generations", body);
        return res.data;
    }
    async getVideoGeneration(generationId) {
        const res = await this.http.get("/v2/video/generations", {
            params: { generation_id: generationId },
        });
        return res.data;
    }
    async pollVideoGeneration(generationId, opts = {}) {
        const { intervalMs = 10000, timeoutMs = 300000 } = opts;
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const result = await this.getVideoGeneration(generationId);
            if (result.status === "completed")
                return result;
            if (result.status === "failed" || result.status === "canceled") {
                throw new Error(`Video generation ${generationId} ended with status "${result.status}"`);
            }
            await sleep(intervalMs);
        }
        throw new Error(`Video generation ${generationId} timed out after ${timeoutMs}ms`);
    }
    // ── Text-to-speech ──────────────────────────────────────────────────────────
    /** Returns the raw audio as a Buffer. */
    async textToSpeech(body) {
        const res = await this.http.post("/v1/audio/speech", body, {
            responseType: "arraybuffer",
        });
        return Buffer.from(res.data);
    }
    // ── Speech-to-text ──────────────────────────────────────────────────────────
    async createTranscriptionFromUrl(model, audioUrl) {
        const res = await this.http.post("/v1/audio/transcriptions", {
            model,
            audio_url: audioUrl,
        });
        return res.data;
    }
    async createTranscriptionFromFile(model, file, filename) {
        const form = new form_data_1.default();
        form.append("model", model);
        form.append("file", file, { filename });
        const res = await this.http.post("/v1/audio/transcriptions", form, {
            headers: form.getHeaders(),
        });
        return res.data;
    }
    async getTranscription(generationId) {
        const res = await this.http.get(`/v1/stt/${generationId}`);
        return res.data;
    }
    async pollTranscription(generationId, opts = {}) {
        const { intervalMs = 10000, timeoutMs = 120000 } = opts;
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const result = await this.getTranscription(generationId);
            if (result.status === "completed")
                return result;
            if (result.status === "failed") {
                throw new Error(`Transcription ${generationId} failed`);
            }
            await sleep(intervalMs);
        }
        throw new Error(`Transcription ${generationId} timed out after ${timeoutMs}ms`);
    }
    // ── Embeddings ──────────────────────────────────────────────────────────────
    async createEmbedding(body) {
        const res = await this.http.post("/v1/embeddings", body);
        return res.data;
    }
    // ── Batch ───────────────────────────────────────────────────────────────────
    async createBatch(requests) {
        const res = await this.http.post("/v1/batches", { requests });
        return res.data;
    }
    async getBatch(batchId) {
        const res = await this.http.get("/v1/batches", {
            params: { batch_id: batchId },
        });
        return res.data;
    }
    async cancelBatch(batchId) {
        await this.http.post(`/v1/batches/cancel/${batchId}`);
    }
    // ── Billing ─────────────────────────────────────────────────────────────────
    async getBalance() {
        const res = await this.http.get("/v1/billing/balance");
        return res.data;
    }
    // ── API key management ──────────────────────────────────────────────────────
    async createApiKey(body) {
        const res = await this.http.post("/v1/keys", body);
        return res.data;
    }
    async listApiKeys() {
        const res = await this.http.get("/v1/keys");
        return res.data;
    }
    async getCurrentKey() {
        const res = await this.http.get("/v1/key");
        return res.data;
    }
    async updateApiKey(prefix, updates) {
        const res = await this.http.patch(`/v1/keys/${prefix}`, updates);
        return res.data;
    }
    async deleteApiKey(prefix) {
        await this.http.delete(`/v1/keys/${prefix}`);
    }
}
exports.AimlApiService = AimlApiService;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
