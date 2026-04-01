import { createOpenAI } from "@ai-sdk/openai";
import { requireEnv } from "../env";

/**
 * AI SDK provider pointed at AIML's OpenAI-compatible endpoint.
 * Call `aimlProvider(modelId)` to get a LanguageModel instance.
 */
export const aimlProvider = createOpenAI({
  apiKey: requireEnv("AIML_API_KEY"),
  baseURL: "https://api.aimlapi.com/v1",
});
