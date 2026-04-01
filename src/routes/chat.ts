import { Router } from "express";
import { streamText, stepCountIs, type ModelMessage } from "ai";
import { sseHeaders, sseWrite } from "../lib/sse";
import { aimlProvider } from "../lib/aiSdkClient";
import { buildAiSdkTools } from "../lib/aiSdkTools";
import { agentModel, getHandlers } from "../services";

const router = Router();

const SYSTEM_PROMPT =
  "You are an API operations agent for 3D figure generation. " +
  "Use tools to execute user requests. " +
  "For 3D models use Tripo tools. For images or AI tasks use AIML tools. Be concise.";

router.post("/", async (req, res) => {
  const { message, history = [] } = req.body as {
    message: string;
    history: { role: string; content: string }[];
  };

  sseHeaders(res);

  const model = agentModel();
  const tools = buildAiSdkTools(getHandlers());

  const messages: ModelMessage[] = [
    ...history.map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user", content: message },
  ];

  console.log(`[chat] model=${model} history=${history.length} tools=${Object.keys(tools).length}`);

  try {
    const result = streamText({
      model: aimlProvider.chat(model),
      system: SYSTEM_PROMPT,
      messages,
      tools,
      stopWhen: stepCountIs(8),
    });

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
});

export default router;
