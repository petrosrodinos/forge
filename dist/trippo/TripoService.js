"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TripoService = void 0;
const form_data_1 = __importDefault(require("form-data"));
const client_1 = require("./client");
const env_1 = require("../env");
class TripoService {
    constructor(apiKey = (0, env_1.requireEnv)("TRIPO_API_KEY")) {
        this.http = (0, client_1.createHttpClient)(apiKey);
    }
    // ── Tasks ────────────────────────────────────────────────────────────────
    async createTask(body) {
        const res = await this.http.post("/task", body);
        return res.data;
    }
    async getTask(taskId) {
        const res = await this.http.get(`/task/${taskId}`);
        return res.data;
    }
    // ── Upload ───────────────────────────────────────────────────────────────
    async uploadFile(file, filename, mimeType) {
        const form = new form_data_1.default();
        form.append("file", file, { filename, contentType: mimeType });
        const res = await this.http.post("/upload", form, {
            headers: form.getHeaders(),
        });
        return res.data;
    }
    async getStsToken(format) {
        const res = await this.http.post("/upload/sts/token", { format });
        return res.data;
    }
    // ── User ─────────────────────────────────────────────────────────────────
    async getBalance() {
        const res = await this.http.get("/user/balance");
        return res.data;
    }
    // ── Polling helper ───────────────────────────────────────────────────────
    async pollTask(taskId, opts = {}) {
        const { intervalMs = 2000, timeoutMs = 300000 } = opts;
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const { data: task } = await this.getTask(taskId);
            if (task.status === "success")
                return task;
            if (["failed", "cancelled", "banned", "expired"].includes(task.status)) {
                throw new Error(`Task ${taskId} ended with status "${task.status}": ${task.error_msg ?? ""}`);
            }
            await sleep(intervalMs);
        }
        throw new Error(`Task ${taskId} timed out after ${timeoutMs}ms`);
    }
}
exports.TripoService = TripoService;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
