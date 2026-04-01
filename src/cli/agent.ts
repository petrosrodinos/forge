import { AimlApiService } from "../integrations/aimlapi/AimlApiService";
import { ChatMessage, Tool } from "../integrations/aimlapi/types";
import { ToolHandler } from "./types";
import { formatOutput, safeJsonParse } from "./parser";

async function runTool(handlers: Record<string, ToolHandler>, name: string, args: Record<string, unknown>): Promise<unknown> {
  const handler = handlers[name];
  if (!handler) throw new Error(`Unknown tool: ${name}`);
  return handler(args);
}

export async function askAgent(
  aiml: AimlApiService,
  model: string,
  tools: Tool[],
  handlers: Record<string, ToolHandler>,
  history: ChatMessage[]
): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const res = await aiml.chatCompletion({
      model,
      messages: history,
      tools,
      tool_choice: "auto",
      temperature: 0.2,
    });
    const choice = res.choices[0];
    if (!choice) return "No response.";
    const assistantMessage = choice.message;
    const toolCalls = assistantMessage.tool_calls ?? [];
    history.push({ role: "assistant", content: assistantMessage.content ?? "", tool_calls: assistantMessage.tool_calls });
    if (!toolCalls.length) return assistantMessage.content ?? "Done.";
    for (const call of toolCalls) {
      try {
        const parsed = call.function.arguments ? safeJsonParse(call.function.arguments) : {};
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Tool arguments must be a JSON object");
        const result = await runTool(handlers, call.function.name, parsed as Record<string, unknown>);
        history.push({ role: "tool", tool_call_id: call.id, content: formatOutput(result) });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        history.push({ role: "tool", tool_call_id: call.id, content: `Tool error: ${message}` });
      }
    }
  }
  return "Stopped after too many tool-calling rounds.";
}
