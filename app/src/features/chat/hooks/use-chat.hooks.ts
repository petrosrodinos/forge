import { useState } from "react";
import { parseSSE } from "@/hooks/useSSE";
import type { ChatMessage, ToolCall } from "@/features/chat/interfaces/chat.interfaces";
import { API_BASE_URL } from "@/utils/constants";

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
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, figureId }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg =
          typeof (errBody as { error?: unknown }).error === "string"
            ? (errBody as { error: string }).error
            : `Chat failed (${res.status})`;
        throw new Error(msg);
      }

      for await (const evt of parseSSE(res.body!)) {
        const data = JSON.parse(evt.data) as Record<string, unknown>;

        const appendText = (delta: string) => {
          assistantText += delta;
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
        };

        if (evt.event === "text") {
          appendText((data.content as string) ?? "");
        } else if (evt.event === "text-delta") {
          appendText((data.delta as string) ?? "");
        }

        if (evt.event === "tool_call" || evt.event === "tool-call") {
          const raw = data.arguments ?? data.input;
          let input: unknown = raw;
          if (typeof raw === "string") {
            try {
              input = JSON.parse(raw);
            } catch {
              input = raw;
            }
          }
          toolCalls.push({
            id: (data.id as string) ?? crypto.randomUUID(),
            name: data.name as string,
            input,
          });
        }

        if (evt.event === "tool_result" || evt.event === "tool-result") {
          const tc = toolCalls.find((t) => t.id === data.id);
          if (tc) tc.result = data.result;
        }

        if (evt.event === "error") {
          throw new Error((data.message as string) ?? "Chat error");
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
