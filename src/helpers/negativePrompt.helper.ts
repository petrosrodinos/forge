export function applyNegativePrompt(prompt: string, negativePrompt?: string | null): string {
  const p = prompt.trim();
  const neg = negativePrompt?.trim();
  if (!neg) return p;

  // AIML's image generation API in this repo does not accept a dedicated negativePrompt field.
  // We encode it in the prompt text so models that support "negative prompt" semantics can use it.
  return `${p}\n\nNegative prompt: ${neg}`;
}

