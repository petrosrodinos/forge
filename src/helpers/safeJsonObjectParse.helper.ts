export function safeParseJsonObject(raw: string): unknown {
  // Some models wrap JSON in code fences; try to extract the outer object.
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenceMatch ? fenceMatch[1] : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    // Fallback: try to grab the first top-level {...} block.
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    }
    return null;
  }
}

