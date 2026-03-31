// ── Shared ───────────────────────────────────────────────────────────────────

export interface AimlApiError {
  message: string;
  path: string;
  requestId: string;
  statusCode: number;
  timestamp: string;
}

// ── Chat completions ──────────────────────────────────────────────────────────

export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface TextContent {
  type: "text";
  text: string;
}

export interface ImageContent {
  type: "image_url";
  image_url: { url: string; detail?: "auto" | "low" | "high" };
}

export type MessageContent = string | Array<TextContent | ImageContent>;

export interface ChatMessage {
  role: MessageRole;
  content: MessageContent;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolFunction {
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
}

export interface Tool {
  type: "function";
  function: ToolFunction;
}

export interface ResponseFormat {
  type: "text" | "json_object" | "json_schema";
  json_schema?: { name: string; schema: Record<string, unknown>; strict?: boolean };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  tools?: Tool[];
  tool_choice?: "auto" | "none" | "required" | { type: "function"; function: { name: string } };
  response_format?: ResponseFormat;
  reasoning_effort?: "low" | "medium" | "high";
  stop?: string | string[];
  n?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  user?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ChatChoice {
  index: number;
  message: { role: MessageRole; content: string | null; tool_calls?: ToolCall[] };
  finish_reason: "stop" | "length" | "tool_calls" | "content_filter" | null;
}

export interface UsageStats {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: ChatChoice[];
  usage: UsageStats;
}

// Streamed chunk shape (stream: true)
export interface ChatCompletionChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: Partial<ChatMessage> & { tool_calls?: ToolCall[] };
    finish_reason: string | null;
  }>;
}

// ── Responses (modern unified endpoint) ──────────────────────────────────────

export interface ResponsesRequest {
  model: string;
  input: string | { role: MessageRole; content: MessageContent };
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface ResponsesResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  output: Array<{ type: string; content: string }>;
  usage: UsageStats;
}

// ── Models ────────────────────────────────────────────────────────────────────

export interface ModelInfo {
  name: string;
  developer: string;
  description?: string;
  contextLength?: number;
  maxTokens?: number;
  url?: string;
  docs_url?: string;
}

export interface ModelItem {
  id: string;
  type: string;
  info: ModelInfo;
  features: string[];
  endpoints: string[];
}

export interface ModelsListResponse {
  object: "list";
  data: ModelItem[];
}

// ── Image generation ──────────────────────────────────────────────────────────

export interface ImageGenerationRequest {
  model: string;
  prompt: string;
  size?: string;
  n?: number;
  steps?: number;
  response_format?: "url" | "b64_json";
}

export interface ImageData {
  url?: string;
  b64_json?: string;
}

export interface ImageGenerationResponse {
  created: number;
  data: ImageData[];
}

// ── Video generation ──────────────────────────────────────────────────────────

export interface VideoGenerationRequest {
  model: string;
  prompt: string;
  image?: string;
  duration?: number;
  resolution?: string;
}

export type VideoGenerationStatus = "processing" | "completed" | "failed" | "canceled";

export interface VideoGenerationResponse {
  generation_id: string;
  status: VideoGenerationStatus;
  video_url?: string;
  created_at: string;
  completed_at?: string;
}

// ── Audio — TTS ───────────────────────────────────────────────────────────────

export type TtsVoice =
  | "alloy"
  | "ash"
  | "coral"
  | "echo"
  | "fable"
  | "nova"
  | "onyx"
  | "sage"
  | "shimmer"
  | "verse";

export type AudioFormat = "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";

export interface TextToSpeechRequest {
  model: string;
  input: string;
  voice: TtsVoice;
  response_format?: AudioFormat;
  speed?: number;
}

// ── Audio — STT ───────────────────────────────────────────────────────────────

export type SttStatus = "processing" | "completed" | "failed";

export interface SttCreateResponse {
  generation_id: string;
  status: SttStatus;
}

export interface SttResultResponse {
  generation_id: string;
  status: SttStatus;
  text?: string;
  language?: string;
}

// ── Embeddings ────────────────────────────────────────────────────────────────

export interface EmbeddingRequest {
  model: string;
  input: string | string[];
  dimensions?: number;
}

export interface EmbeddingObject {
  object: "embedding";
  embedding: number[];
  index: number;
}

export interface EmbeddingResponse {
  object: "list";
  data: EmbeddingObject[];
  model: string;
  usage: Pick<UsageStats, "prompt_tokens" | "total_tokens">;
}

// ── Batch ─────────────────────────────────────────────────────────────────────

export interface BatchRequestItem {
  custom_id: string;
  params: ChatCompletionRequest;
}

export interface BatchCounts {
  processing: number;
  succeeded: number;
  errored: number;
  canceled: number;
  expired: number;
}

export type BatchStatus = "in_progress" | "succeeded" | "canceling";

export interface BatchResponse {
  batch_id: string;
  type: string;
  processing_status: BatchStatus;
  request_counts: BatchCounts;
  created_at: string;
  expires_at?: string;
}

// ── Billing ───────────────────────────────────────────────────────────────────

export interface BillingBalance {
  balance: number;
  lowBalance: boolean;
  lowBalanceThreshold: number;
  lastUpdated: string;
  autoDebitStatus: string;
  status: string;
  statusExplanation: string;
}

// ── API Key management ────────────────────────────────────────────────────────

export interface ApiKeyScope {
  chat?: boolean;
  image?: boolean;
  audio?: boolean;
  video?: boolean;
  embeddings?: boolean;
}

export interface CreateApiKeyRequest {
  name: string;
  dailySpendLimit?: number;
  monthlySpendLimit?: number;
  scopes?: string[];
}

export interface ApiKeyItem {
  prefix: string;
  name: string;
  status: "active" | "disabled";
  scopes: string[];
  dailySpendLimit?: number;
  monthlySpendLimit?: number;
  created_at: string;
}
