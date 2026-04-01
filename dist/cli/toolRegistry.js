"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildToolDefs = buildToolDefs;
exports.makeHandlers = makeHandlers;
const path_1 = __importDefault(require("path"));
const figures_1 = require("../lib/figures");
const fileHelpers_1 = require("./fileHelpers");
function buildToolDefs() {
    return [
        { type: "function", function: { name: "aiml_listModels", description: "List available AIML models", parameters: { type: "object", properties: {}, additionalProperties: false } } },
        { type: "function", function: { name: "aiml_responses", description: "Call AIML responses endpoint", parameters: { type: "object", properties: { model: { type: "string" }, input: { oneOf: [{ type: "string" }, { type: "object" }] }, max_tokens: { type: "number" }, temperature: { type: "number" }, stream: { type: "boolean" } }, required: ["model", "input"], additionalProperties: true } } },
        { type: "function", function: { name: "aiml_chatCompletion", description: "Call AIML chat completion endpoint", parameters: { type: "object", properties: { model: { type: "string" }, messages: { type: "array" }, max_tokens: { type: "number" }, temperature: { type: "number" } }, required: ["model", "messages"], additionalProperties: true } } },
        { type: "function", function: { name: "aiml_generateImage", description: "Generate images from prompt", parameters: { type: "object", properties: { model: { type: "string" }, prompt: { type: "string" }, size: { type: "string" }, n: { type: "number" }, steps: { type: "number" }, response_format: { type: "string" } }, required: ["model", "prompt"], additionalProperties: true } } },
        { type: "function", function: { name: "aiml_generateImageToFile", description: "Generate image and save first result to local file", parameters: { type: "object", properties: { model: { type: "string" }, prompt: { type: "string" }, size: { type: "string" }, n: { type: "number" }, steps: { type: "number" }, response_format: { type: "string", enum: ["url", "b64_json"] }, outputPath: { type: "string" } }, required: ["model", "prompt", "outputPath"], additionalProperties: true } } },
        { type: "function", function: { name: "aiml_createVideoGeneration", description: "Create AIML video generation", parameters: { type: "object", properties: { model: { type: "string" }, prompt: { type: "string" }, image: { type: "string" }, duration: { type: "number" }, resolution: { type: "string" } }, required: ["model", "prompt"], additionalProperties: true } } },
        { type: "function", function: { name: "aiml_getVideoGeneration", description: "Get AIML video generation by id", parameters: { type: "object", properties: { generationId: { type: "string" } }, required: ["generationId"], additionalProperties: false } } },
        { type: "function", function: { name: "aiml_pollVideoGeneration", description: "Poll AIML video generation until completion", parameters: { type: "object", properties: { generationId: { type: "string" }, intervalMs: { type: "number" }, timeoutMs: { type: "number" } }, required: ["generationId"], additionalProperties: false } } },
        { type: "function", function: { name: "aiml_createEmbedding", description: "Create embeddings", parameters: { type: "object", properties: { model: { type: "string" }, input: { oneOf: [{ type: "string" }, { type: "array" }] }, dimensions: { type: "number" } }, required: ["model", "input"], additionalProperties: true } } },
        { type: "function", function: { name: "aiml_textToSpeechToFile", description: "Generate speech audio and save to local file", parameters: { type: "object", properties: { model: { type: "string" }, input: { type: "string" }, voice: { type: "string" }, response_format: { type: "string" }, speed: { type: "number" }, outputPath: { type: "string" } }, required: ["model", "input", "voice"], additionalProperties: true } } },
        { type: "function", function: { name: "aiml_transcribeFile", description: "Transcribe local audio file", parameters: { type: "object", properties: { model: { type: "string" }, filePath: { type: "string" }, filename: { type: "string" } }, required: ["model", "filePath"], additionalProperties: false } } },
        { type: "function", function: { name: "aiml_getBalance", description: "Get AIML billing balance", parameters: { type: "object", properties: {}, additionalProperties: false } } },
        { type: "function", function: { name: "aiml_listApiKeys", description: "List AIML API keys", parameters: { type: "object", properties: {}, additionalProperties: false } } },
        { type: "function", function: { name: "aiml_getCurrentKey", description: "Get current AIML API key metadata", parameters: { type: "object", properties: {}, additionalProperties: false } } },
        { type: "function", function: { name: "tripo_createTask", description: "Create Tripo task", parameters: { type: "object", properties: {}, required: ["type"], additionalProperties: true } } },
        { type: "function", function: { name: "tripo_getTask", description: "Get Tripo task status", parameters: { type: "object", properties: { taskId: { type: "string" } }, required: ["taskId"], additionalProperties: false } } },
        { type: "function", function: { name: "tripo_pollTask", description: "Poll Tripo task until completion", parameters: { type: "object", properties: { taskId: { type: "string" }, intervalMs: { type: "number" }, timeoutMs: { type: "number" } }, required: ["taskId"], additionalProperties: false } } },
        { type: "function", function: { name: "tripo_getBalance", description: "Get Tripo user balance", parameters: { type: "object", properties: {}, additionalProperties: false } } },
        { type: "function", function: { name: "tripo_getStsToken", description: "Get Tripo upload sts token", parameters: { type: "object", properties: { format: { type: "string", enum: ["webp", "jpeg", "png"] } }, required: ["format"], additionalProperties: false } } },
        { type: "function", function: { name: "tripo_uploadImageFromPath", description: "Upload local image to Tripo upload endpoint", parameters: { type: "object", properties: { filePath: { type: "string" }, filename: { type: "string" }, mimeType: { type: "string", enum: ["image/png", "image/jpeg"] } }, required: ["filePath"], additionalProperties: false } } },
        { type: "function", function: { name: "figures_list", description: "List all figures and obstacles from figures.json", parameters: { type: "object", properties: { type: { type: "string", enum: ["figure", "obstacle"], description: "Filter by type" } }, additionalProperties: false } } },
        { type: "function", function: { name: "figures_get", description: "Get a single figure or obstacle by name", parameters: { type: "object", properties: { name: { type: "string" } }, required: ["name"], additionalProperties: false } } },
        { type: "function", function: { name: "figures_create", description: "Create a new figure or obstacle in figures.json", parameters: { type: "object", properties: { figure: { type: "object", description: "Full figure object with name, type, default, and optional skins" } }, required: ["figure"], additionalProperties: false } } },
        { type: "function", function: { name: "figures_update", description: "Replace a figure or obstacle by name in figures.json", parameters: { type: "object", properties: { name: { type: "string", description: "Current name of the figure to update" }, figure: { type: "object", description: "Full updated figure object" } }, required: ["name", "figure"], additionalProperties: false } } },
        { type: "function", function: { name: "figures_delete", description: "Delete a figure or obstacle by name from figures.json", parameters: { type: "object", properties: { name: { type: "string" } }, required: ["name"], additionalProperties: false } } },
    ];
}
function makeHandlers(aiml, tripo) {
    return {
        aiml_listModels: async () => aiml.listModels(),
        aiml_responses: async (args) => aiml.responses(args),
        aiml_chatCompletion: async (args) => aiml.chatCompletion(args),
        aiml_generateImage: async (args) => aiml.generateImage(args),
        aiml_generateImageToFile: async (args) => {
            const outputPath = (0, fileHelpers_1.requiredString)(args, "outputPath");
            const response = await aiml.generateImage(args);
            const first = response.data[0];
            if (!first)
                throw new Error("No image returned");
            if (first.b64_json)
                return { savedPath: await (0, fileHelpers_1.writeBufferToPath)(Buffer.from(first.b64_json, "base64"), outputPath) };
            if (first.url)
                return { savedPath: await (0, fileHelpers_1.saveImageFromUrl)(first.url, outputPath), sourceUrl: first.url };
            throw new Error("Image response did not include url or b64_json");
        },
        aiml_createVideoGeneration: async (args) => aiml.createVideoGeneration(args),
        aiml_getVideoGeneration: async (args) => aiml.getVideoGeneration(String(args.generationId)),
        aiml_pollVideoGeneration: async (args) => aiml.pollVideoGeneration(String(args.generationId), { intervalMs: typeof args.intervalMs === "number" ? args.intervalMs : undefined, timeoutMs: typeof args.timeoutMs === "number" ? args.timeoutMs : undefined }),
        aiml_createEmbedding: async (args) => aiml.createEmbedding(args),
        aiml_textToSpeechToFile: async (args) => {
            const outputPath = (0, fileHelpers_1.optionalString)(args, "outputPath") ?? path_1.default.resolve(process.cwd(), `speech-${Date.now()}.${(0, fileHelpers_1.defaultAudioExt)(args.response_format)}`);
            const audio = await aiml.textToSpeech({
                model: (0, fileHelpers_1.requiredString)(args, "model"),
                input: (0, fileHelpers_1.requiredString)(args, "input"),
                voice: (0, fileHelpers_1.requiredString)(args, "voice"),
                response_format: (0, fileHelpers_1.optionalString)(args, "response_format"),
                speed: typeof args.speed === "number" ? args.speed : undefined,
            });
            return { savedPath: await (0, fileHelpers_1.writeBufferToPath)(audio, outputPath) };
        },
        aiml_transcribeFile: async (args) => {
            const { absolutePath, data } = await (0, fileHelpers_1.readLocalFile)((0, fileHelpers_1.requiredString)(args, "filePath"));
            const filename = (0, fileHelpers_1.optionalString)(args, "filename") ?? path_1.default.basename(absolutePath);
            const created = await aiml.createTranscriptionFromFile((0, fileHelpers_1.requiredString)(args, "model"), data, filename);
            return aiml.pollTranscription(created.generation_id);
        },
        aiml_getBalance: async () => aiml.getBalance(),
        aiml_listApiKeys: async () => aiml.listApiKeys(),
        aiml_getCurrentKey: async () => aiml.getCurrentKey(),
        tripo_createTask: async (args) => tripo.createTask(args),
        tripo_getTask: async (args) => tripo.getTask(String(args.taskId)),
        tripo_pollTask: async (args) => tripo.pollTask(String(args.taskId), { intervalMs: typeof args.intervalMs === "number" ? args.intervalMs : undefined, timeoutMs: typeof args.timeoutMs === "number" ? args.timeoutMs : undefined }),
        tripo_getBalance: async () => tripo.getBalance(),
        tripo_getStsToken: async (args) => tripo.getStsToken(args.format),
        tripo_uploadImageFromPath: async (args) => {
            const { absolutePath, data } = await (0, fileHelpers_1.readLocalFile)((0, fileHelpers_1.requiredString)(args, "filePath"));
            const filename = (0, fileHelpers_1.optionalString)(args, "filename") ?? path_1.default.basename(absolutePath);
            const mimeType = (0, fileHelpers_1.optionalString)(args, "mimeType") ?? (0, fileHelpers_1.inferMimeTypeFromPath)(absolutePath);
            return tripo.uploadFile(data, filename, mimeType);
        },
        figures_list: async (args) => {
            const figures = await (0, figures_1.readFigures)();
            if (typeof args.type === "string")
                return figures.filter((f) => f.type === args.type);
            return figures;
        },
        figures_get: async (args) => {
            const figures = await (0, figures_1.readFigures)();
            const figure = figures.find((f) => f.name === args.name);
            if (!figure)
                throw new Error(`Figure "${args.name}" not found`);
            return figure;
        },
        figures_create: async (args) => {
            const figures = await (0, figures_1.readFigures)();
            const figure = args.figure;
            if (!figure?.name)
                throw new Error("figure.name is required");
            if (figures.some((f) => f.name === figure.name))
                throw new Error(`Figure "${figure.name}" already exists`);
            figures.push(figure);
            await (0, figures_1.writeFigures)(figures);
            return figure;
        },
        figures_update: async (args) => {
            const figures = await (0, figures_1.readFigures)();
            const idx = figures.findIndex((f) => f.name === args.name);
            if (idx === -1)
                throw new Error(`Figure "${args.name}" not found`);
            figures[idx] = args.figure;
            await (0, figures_1.writeFigures)(figures);
            return figures[idx];
        },
        figures_delete: async (args) => {
            const figures = await (0, figures_1.readFigures)();
            const idx = figures.findIndex((f) => f.name === args.name);
            if (idx === -1)
                throw new Error(`Figure "${args.name}" not found`);
            const [deleted] = figures.splice(idx, 1);
            await (0, figures_1.writeFigures)(figures);
            return deleted;
        },
    };
}
