import { AimlApiService } from "../integrations/aimlapi/AimlApiService";
import { Tool } from "../integrations/aimlapi/types";
import { TripoService } from "../integrations/trippo/TripoService";

export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

export interface CommandDefinition {
  name: string;
  description: string;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface CliContext {
  aiml: AimlApiService;
  tripo: TripoService;
  tools: Tool[];
  handlers: Record<string, ToolHandler>;
  commands: Record<string, CommandDefinition>;
}
