import path from "path";
import { AimlApiService } from "../integrations/aimlapi/AimlApiService";
import { Tool } from "../integrations/aimlapi/types";
import { TripoService } from "../integrations/trippo/TripoService";
import { ToolHandler } from "./types";
import { readFigures, writeFigures } from "../lib/figures";
import {
  defaultAudioExt,
  inferMimeTypeFromPath,
  optionalString,
  readLocalFile,
  requiredString,
  saveImageFromUrl,
  writeBufferToPath,
} from "./fileHelpers";

export function buildToolDefs(): Tool[] {
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

export function makeHandlers(aiml: AimlApiService, tripo: TripoService): Record<string, ToolHandler> {
  return {
    aiml_listModels: async () => aiml.listModels(),
    aiml_responses: async (args) => aiml.responses(args as never),
    aiml_chatCompletion: async (args) => aiml.chatCompletion(args as never),
    aiml_generateImage: async (args) => {
      const { data, costsMetadata } = await aiml.generateImage(args as never);
      return { ...data, costsMetadata };
    },
    aiml_generateImageToFile: async (args) => {
      const outputPath = requiredString(args, "outputPath");
      const { data: imagePayload } = await aiml.generateImage(args as never);
      const first = imagePayload.data[0];
      if (!first) throw new Error("No image returned");
      if (first.b64_json) return { savedPath: await writeBufferToPath(Buffer.from(first.b64_json, "base64"), outputPath) };
      if (first.url) return { savedPath: await saveImageFromUrl(first.url, outputPath), sourceUrl: first.url };
      throw new Error("Image response did not include url or b64_json");
    },
    aiml_createVideoGeneration: async (args) => aiml.createVideoGeneration(args as never),
    aiml_getVideoGeneration: async (args) => aiml.getVideoGeneration(String(args.generationId)),
    aiml_pollVideoGeneration: async (args) => aiml.pollVideoGeneration(String(args.generationId), { intervalMs: typeof args.intervalMs === "number" ? args.intervalMs : undefined, timeoutMs: typeof args.timeoutMs === "number" ? args.timeoutMs : undefined }),
    aiml_createEmbedding: async (args) => aiml.createEmbedding(args as never),
    aiml_textToSpeechToFile: async (args) => {
      const outputPath = optionalString(args, "outputPath") ?? path.resolve(process.cwd(), `speech-${Date.now()}.${defaultAudioExt(args.response_format)}`);
      const audio = await aiml.textToSpeech({
        model: requiredString(args, "model"),
        input: requiredString(args, "input"),
        voice: requiredString(args, "voice") as never,
        response_format: optionalString(args, "response_format") as never,
        speed: typeof args.speed === "number" ? args.speed : undefined,
      });
      return { savedPath: await writeBufferToPath(audio, outputPath) };
    },
    aiml_transcribeFile: async (args) => {
      const { absolutePath, data } = await readLocalFile(requiredString(args, "filePath"));
      const filename = optionalString(args, "filename") ?? path.basename(absolutePath);
      const created = await aiml.createTranscriptionFromFile(requiredString(args, "model"), data, filename);
      return aiml.pollTranscription(created.generation_id);
    },
    aiml_getBalance: async () => aiml.getBalance(),
    aiml_listApiKeys: async () => aiml.listApiKeys(),
    aiml_getCurrentKey: async () => aiml.getCurrentKey(),
    tripo_createTask: async (args) => {
      const { createTaskResponse, costsMetadata } = await tripo.createTask(args as never);
      return { task: createTaskResponse, costsMetadata };
    },
    tripo_getTask: async (args) => tripo.getTask(String(args.taskId)),
    tripo_pollTask: async (args) => tripo.pollTask(String(args.taskId), { intervalMs: typeof args.intervalMs === "number" ? args.intervalMs : undefined, timeoutMs: typeof args.timeoutMs === "number" ? args.timeoutMs : undefined }),
    tripo_getBalance: async () => tripo.getBalance(),
    tripo_getStsToken: async (args) => tripo.getStsToken(args.format as never),
    tripo_uploadImageFromPath: async (args) => {
      const { absolutePath, data } = await readLocalFile(requiredString(args, "filePath"));
      const filename = optionalString(args, "filename") ?? path.basename(absolutePath);
      const mimeType = (optionalString(args, "mimeType") as "image/png" | "image/jpeg" | undefined) ?? inferMimeTypeFromPath(absolutePath);
      return tripo.uploadFile(data, filename, mimeType);
    },
    figures_list: async (args) => {
      const figures = await readFigures();
      if (typeof args.type === "string") return figures.filter((f: any) => f.type === args.type);
      return figures;
    },
    figures_get: async (args) => {
      const figures = await readFigures();
      const figure = figures.find((f: any) => f.name === args.name);
      if (!figure) throw new Error(`Figure "${args.name}" not found`);
      return figure;
    },
    figures_create: async (args) => {
      const figures = await readFigures();
      const figure = args.figure as any;
      if (!figure?.name) throw new Error("figure.name is required");
      if (figures.some((f: any) => f.name === figure.name)) throw new Error(`Figure "${figure.name}" already exists`);
      figures.push(figure);
      await writeFigures(figures);
      return figure;
    },
    figures_update: async (args) => {
      const figures = await readFigures();
      const idx = figures.findIndex((f: any) => f.name === args.name);
      if (idx === -1) throw new Error(`Figure "${args.name}" not found`);
      figures[idx] = args.figure;
      await writeFigures(figures);
      return figures[idx];
    },
    figures_delete: async (args) => {
      const figures = await readFigures();
      const idx = figures.findIndex((f: any) => f.name === args.name);
      if (idx === -1) throw new Error(`Figure "${args.name}" not found`);
      const [deleted] = figures.splice(idx, 1);
      await writeFigures(figures);
      return deleted;
    },
  };
}
