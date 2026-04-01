import type { Tool } from "../integrations/aimlapi/types";

/**
 * Sanitise tool definitions before sending them to an OpenAI-compatible API.
 *
 * Known causes of 400 "Provider returned error":
 *  - `oneOf` / `anyOf` / `allOf` — not supported in function parameter schemas.
 *  - `required` listing a key absent from `properties`.
 *  - Empty property schema `{}` — some proxies reject it; use `{ type: "string" }`.
 *  - `additionalProperties` — removing it avoids strict-mode activation on some
 *    AIML-proxied models that forward it to OpenAI with unintended effects.
 */
export function sanitizeTools(tools: Tool[]): Tool[] {
  return tools.map((tool) => ({
    ...tool,
    function: {
      ...tool.function,
      parameters: sanitizeSchema(
        tool.function.parameters as Record<string, unknown>
      ),
    },
  }));
}

function sanitizeSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const s = { ...schema };

  // Remove unsupported combinators.
  delete s.oneOf;
  delete s.anyOf;
  delete s.allOf;

  // Remove additionalProperties entirely — avoids triggering strict-mode behaviour
  // in AIML proxy layers that forward the flag directly to the upstream provider.
  delete s.additionalProperties;

  // Ensure every key in `required` exists in `properties`.
  if (Array.isArray(s.required) && s.properties && typeof s.properties === "object") {
    const props = s.properties as Record<string, unknown>;
    for (const key of s.required as string[]) {
      if (!props[key]) props[key] = { type: "string" };
    }
  }

  // Recurse into property schemas; replace empty `{}` with `{ type: "string" }`.
  if (s.properties && typeof s.properties === "object") {
    s.properties = Object.fromEntries(
      Object.entries(s.properties as Record<string, unknown>).map(([k, v]) => {
        const propSchema = v as Record<string, unknown>;
        const isEmpty = Object.keys(propSchema).length === 0;
        return [k, isEmpty ? { type: "string" } : sanitizeSchema(propSchema)];
      })
    );
  }

  return s;
}
