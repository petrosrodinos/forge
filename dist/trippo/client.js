"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHttpClient = createHttpClient;
const axios_1 = __importDefault(require("axios"));
const BASE_URL = "https://api.tripo3d.ai/v2/openapi";
function createHttpClient(apiKey) {
    const client = axios_1.default.create({
        baseURL: BASE_URL,
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
    });
    client.interceptors.response.use((res) => res, (err) => {
        const data = err.response?.data;
        const message = data?.message ?? err.message;
        const suggestion = data?.suggestion ?? "";
        const code = data?.code ?? err.response?.status ?? 0;
        throw Object.assign(new Error(`[${code}] ${message}${suggestion ? ` — ${suggestion}` : ""}`), {
            code,
            suggestion,
            status: err.response?.status,
        });
    });
    return client;
}
