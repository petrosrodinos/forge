"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAimlHttpClient = createAimlHttpClient;
const axios_1 = __importDefault(require("axios"));
const BASE_URL = "https://api.aimlapi.com";
function createAimlHttpClient(apiKey) {
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
        const statusCode = data?.statusCode ?? err.response?.status ?? 0;
        const requestId = data?.requestId ?? "";
        throw Object.assign(new Error(`[${statusCode}] ${message}${requestId ? ` (requestId: ${requestId})` : ""}`), { statusCode, requestId, path: data?.path });
    });
    return client;
}
