import { useState } from "react";
import { parseSSE } from "@/hooks/useSSE";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
  result?: unknown;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(content: string, figureId?: string) {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);
    setError(null);

    const assistantId = crypto.randomUUID();
    let assistantText = "";
    const toolCalls: ToolCall[] = [];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, figureId }),
      });

      for await (const evt of parseSSE(res.body!)) {
        const data = JSON.parse(evt.data) as Record<string, unknown>;

        if (evt.event === "text-delta") {
          assistantText += (data.delta as string) ?? "";
          setMessages((prev) => {
            const next = [...prev];
            const idx = next.findIndex((m) => m.id === assistantId);
            const updated: ChatMessage = {
              id: assistantId,
              role: "assistant",
              content: assistantText,
              toolCalls: [...toolCalls],
            };
            if (idx >= 0) next[idx] = updated;
            else next.push(updated);
            return next;
          });
        }

        if (evt.event === "tool-call") {
          toolCalls.push({
            id: (data.id as string) ?? crypto.randomUUID(),
            name: data.name as string,
            input: data.input,
          });
        }

        if (evt.event === "tool-result") {
          const tc = toolCalls.find((t) => t.id === data.id);
          if (tc) tc.result = data.result;
        }

        if (evt.event === "done") break;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chat failed");
    } finally {
      setStreaming(false);
    }
  }

  return { messages, streaming, error, send };
}
