import { jsonSchema, tool, type Tool } from "ai";
import { buildToolDefs } from "../cli/toolRegistry";
import { sanitizeTools } from "./sanitizeTools";
import type { ToolHandler } from "../cli/types";

/**
 * Convert the existing tool definitions + handlers into the AI SDK v6 tool format.
 * Uses `jsonSchema()` so we don't need to re-declare schemas in Zod.
 */
export function buildAiSdkTools(handlers: Record<string, ToolHandler>) {
  const defs = sanitizeTools(buildToolDefs());

  return Object.fromEntries(
    defs.map((def) => [
      def.function.name,
      tool({
        description: def.function.description ?? def.function.name,
        inputSchema: jsonSchema(
          def.function.parameters as Parameters<typeof jsonSchema>[0]
        ) as Tool<Record<string, unknown>, unknown>["inputSchema"],
        execute: async (input: Record<string, unknown>) => {
          console.log(`[tool] ${def.function.name}`, input);
          const handler = handlers[def.function.name];
          if (!handler) throw new Error(`No handler for tool: ${def.function.name}`);
          return handler(input);
        },
      }) as Tool<Record<string, unknown>, unknown>,
    ])
  );
}
