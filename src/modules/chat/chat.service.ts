import { streamText, stepCountIs, type ModelMessage } from "ai";
import { aimlProvider } from "../../lib/aiSdkClient";
import { buildAiSdkTools } from "../../lib/aiSdkTools";
import { agentModel, getHandlers } from "../../services";

export const CHAT_SYSTEM_PROMPT =
  "You are an API operations agent for 3D figure generation. " +
  "Use tools to execute user requests. " +
  "For 3D models use Tripo tools. For images or AI tasks use AIML tools. Be concise.";

export function createChatStream(message: string, history: { role: string; content: string }[]) {
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

  return streamText({
    model: aimlProvider.chat(model),
    system: CHAT_SYSTEM_PROMPT,
    messages,
    tools,
    stopWhen: stepCountIs(8),
  });
}

