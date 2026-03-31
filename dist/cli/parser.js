"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeJsonParse = safeJsonParse;
exports.formatOutput = formatOutput;
exports.splitCommand = splitCommand;
exports.parseCallInput = parseCallInput;
exports.splitTokens = splitTokens;
exports.parseRunInput = parseRunInput;
function safeJsonParse(input) {
    return JSON.parse(input);
}
function formatOutput(value) {
    if (typeof value === "string")
        return value;
    return JSON.stringify(value, null, 2);
}
function splitCommand(input) {
    const trimmed = input.trim();
    const firstSpace = trimmed.indexOf(" ");
    if (firstSpace < 0)
        return { cmd: trimmed, rest: "" };
    return { cmd: trimmed.slice(0, firstSpace), rest: trimmed.slice(firstSpace + 1).trim() };
}
function parseCallInput(rest) {
    const firstSpace = rest.indexOf(" ");
    if (firstSpace < 0)
        return { toolName: rest, args: {} };
    const toolName = rest.slice(0, firstSpace).trim();
    const rawJson = rest.slice(firstSpace + 1).trim();
    const parsed = rawJson ? safeJsonParse(rawJson) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Arguments must be a JSON object");
    }
    return { toolName, args: parsed };
}
function splitTokens(input) {
    const matches = input.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);
    return matches ?? [];
}
function unquote(value) {
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1);
    }
    return value;
}
function coerce(value) {
    const trimmed = value.trim();
    if (trimmed === "true")
        return true;
    if (trimmed === "false")
        return false;
    if (trimmed === "null")
        return null;
    if (/^-?\d+(\.\d+)?$/.test(trimmed))
        return Number(trimmed);
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        try {
            return safeJsonParse(trimmed);
        }
        catch {
            return trimmed;
        }
    }
    return unquote(trimmed);
}
function parseRunInput(rest) {
    const tokens = splitTokens(rest);
    if (!tokens.length)
        throw new Error("Missing command name. Use /commands to list");
    const commandName = tokens[0];
    const argsTokens = tokens.slice(1);
    if (!argsTokens.length)
        return { commandName, args: {} };
    const joined = argsTokens.join(" ").trim();
    if (joined.startsWith("{")) {
        const parsed = safeJsonParse(joined);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("Run JSON args must be an object");
        }
        return { commandName, args: parsed };
    }
    const args = {};
    for (const token of argsTokens) {
        const eq = token.indexOf("=");
        if (eq < 1)
            throw new Error(`Invalid arg "${token}". Use key=value or JSON object`);
        const key = token.slice(0, eq);
        const value = token.slice(eq + 1);
        args[key] = coerce(value);
    }
    return { commandName, args };
}
