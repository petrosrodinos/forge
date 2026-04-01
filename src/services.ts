import "dotenv/config";
import { AimlApiService } from "./integrations/aimlapi/AimlApiService";
import { TripoService } from "./integrations/trippo/TripoService";
import { makeHandlers } from "./cli/toolRegistry";

// Lazy singletons — instantiated on first use so missing env vars
// surface as runtime API errors rather than startup crashes.
let _aiml: AimlApiService | undefined;
let _tripo: TripoService | undefined;

export const getAiml = (): AimlApiService => (_aiml ??= new AimlApiService());
export const getTripo = (): TripoService => (_tripo ??= new TripoService());

export const agentModel = (): string =>
  process.env.AGENT_MODEL ?? "gpt-4o-mini";

export const getHandlers = () => makeHandlers(getAiml(), getTripo());
