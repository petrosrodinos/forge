export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
  result?: unknown;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
}
