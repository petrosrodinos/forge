export function safeJsonParse(input: string): unknown {
  return JSON.parse(input);
}

export function formatOutput(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export function splitCommand(input: string): { cmd: string; rest: string } {
  const trimmed = input.trim();
  const firstSpace = trimmed.indexOf(" ");
  if (firstSpace < 0) return { cmd: trimmed, rest: "" };
  return { cmd: trimmed.slice(0, firstSpace), rest: trimmed.slice(firstSpace + 1).trim() };
}

export function parseCallInput(rest: string): { toolName: string; args: Record<string, unknown> } {
  const firstSpace = rest.indexOf(" ");
  if (firstSpace < 0) return { toolName: rest, args: {} };
  const toolName = rest.slice(0, firstSpace).trim();
  const rawJson = rest.slice(firstSpace + 1).trim();
  const parsed = rawJson ? safeJsonParse(rawJson) : {};
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Arguments must be a JSON object");
  }
  return { toolName, args: parsed as Record<string, unknown> };
}

export function splitTokens(input: string): string[] {
  const matches = input.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);
  return matches ?? [];
}

function unquote(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function coerce(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      return safeJsonParse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return unquote(trimmed);
}

export function parseRunInput(rest: string): { commandName: string; args: Record<string, unknown> } {
  const tokens = splitTokens(rest);
  if (!tokens.length) throw new Error("Missing command name. Use /commands to list");
  const commandName = tokens[0];
  const argsTokens = tokens.slice(1);
  if (!argsTokens.length) return { commandName, args: {} };
  const joined = argsTokens.join(" ").trim();
  if (joined.startsWith("{")) {
    const parsed = safeJsonParse(joined);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Run JSON args must be an object");
    }
    return { commandName, args: parsed as Record<string, unknown> };
  }
  const args: Record<string, unknown> = {};
  for (const token of argsTokens) {
    const eq = token.indexOf("=");
    if (eq < 1) throw new Error(`Invalid arg "${token}". Use key=value or JSON object`);
    const key = token.slice(0, eq);
    const value = token.slice(eq + 1);
    args[key] = coerce(value);
  }
  return { commandName, args };
}
