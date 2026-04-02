import type { Request, Response } from "express";
import { sseHeaders, sseWrite } from "../../lib/sse";
import { createChatStream } from "./chat.service";

export async function chatController(req: Request, res: Response) {
  const { message, history = [] } = req.body as {
    message: string;
    history: { role: string; content: string }[];
  };

  sseHeaders(res);

  try {
    const result = createChatStream(message, history);
    let textAccum = "";

    for await (const chunk of result.fullStream) {
      switch (chunk.type) {
        case "text-delta":
          textAccum += chunk.text;
          break;
        case "tool-call":
          if (textAccum.trim()) {
            sseWrite(res, "text", { content: textAccum });
            textAccum = "";
          }
          sseWrite(res, "tool_call", {
            id: chunk.toolCallId,
            name: chunk.toolName,
            arguments: JSON.stringify(chunk.input),
          });
          break;
        case "tool-result":
          sseWrite(res, "tool_result", {
            id: chunk.toolCallId,
            name: chunk.toolName,
            result: JSON.stringify(chunk.output, null, 2),
          });
          break;
        case "finish":
          if (textAccum.trim()) {
            sseWrite(res, "text", { content: textAccum });
            textAccum = "";
          }
          console.log(`[chat] finish reason=${chunk.finishReason}`);
          break;
        case "error":
          throw chunk.error;
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[chat] error:", msg);
    sseWrite(res, "error", { message: msg });
  } finally {
    sseWrite(res, "done", {});
    res.end();
  }
}

