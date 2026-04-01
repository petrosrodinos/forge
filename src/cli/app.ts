import readline from "readline";
import { AimlApiService } from "../integrations/aimlapi/AimlApiService";
import { ChatMessage } from "../integrations/aimlapi/types";
import { TripoService } from "../integrations/trippo/TripoService";
import { requireEnv } from "../env";
import { askAgent } from "./agent";
import { buildServiceCommands } from "./commandRegistry";
import { formatOutput, parseCallInput, parseRunInput, splitCommand } from "./parser";
import { buildToolDefs, makeHandlers } from "./toolRegistry";
import { CliContext } from "./types";

function printHelp(): void {
  console.log("Commands:");
  console.log("  /help                               Show help");
  console.log("  /tools                              List callable AI tools");
  console.log("  /commands                           List direct service commands");
  console.log('  /call <tool> <json>                 Call tool directly, ex: /call tripo_getTask {"taskId":"..."}');
  console.log('  /run <service.method> <args>        Run direct command, ex: /run tripo.getTask taskId="..."');
  console.log("  /exit                               Exit");
  console.log("Natural language input uses AI planning + tool calls.");
}

function createContext(): CliContext {
  const aiml = new AimlApiService();
  const tripo = new TripoService();
  const tools = buildToolDefs();
  const handlers = makeHandlers(aiml, tripo);
  const commands = buildServiceCommands(handlers);
  return { aiml, tripo, tools, handlers, commands };
}

async function runDirectCommand(context: CliContext, commandName: string, args: Record<string, unknown>): Promise<unknown> {
  const command = context.commands[commandName];
  if (!command) throw new Error(`Unknown command: ${commandName}`);
  return command.execute(args);
}

async function runDirectTool(context: CliContext, toolName: string, args: Record<string, unknown>): Promise<unknown> {
  const handler = context.handlers[toolName];
  if (!handler) throw new Error(`Unknown tool: ${toolName}`);
  return handler(args);
}

async function runOneShot(context: CliContext, argv: string[]): Promise<boolean> {
  if (!argv.length) return false;
  const mode = argv[0];
  if (mode === "tools") {
    for (const tool of context.tools) console.log(`- ${tool.function.name}`);
    return true;
  }
  if (mode === "commands") {
    for (const name of Object.keys(context.commands)) console.log(`- ${name}`);
    return true;
  }
  if (mode === "call") {
    const rest = argv.slice(1).join(" ").trim();
    const { toolName, args } = parseCallInput(rest);
    console.log(formatOutput(await runDirectTool(context, toolName, args)));
    return true;
  }
  if (mode === "run") {
    const rest = argv.slice(1).join(" ").trim();
    const { commandName, args } = parseRunInput(rest);
    console.log(formatOutput(await runDirectCommand(context, commandName, args)));
    return true;
  }
  return false;
}

async function runInteractive(context: CliContext): Promise<void> {
  const agentModel = process.env.AGENT_MODEL || "gpt-4o-mini";
  const history: ChatMessage[] = [
    {
      role: "system",
      content: "You are an API operations agent. Use tools to execute user requests against AIML and Tripo services. Prefer tools over guessing. Ask concise clarification only when required parameters are missing.",
    },
  ];

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "agent> " });
  console.log("Interactive coding agent CLI");
  console.log(`Planner model: ${agentModel}`);
  console.log(`Loaded env: AIML_API_KEY=${Boolean(requireEnv("AIML_API_KEY"))}, TRIPO_API_KEY=${Boolean(requireEnv("TRIPO_API_KEY"))}`);
  printHelp();
  rl.prompt();

  rl.on("line", async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }
    try {
      const { cmd, rest } = splitCommand(input);
      if (cmd === "/exit") {
        rl.close();
        return;
      }
      if (cmd === "/help") {
        printHelp();
        rl.prompt();
        return;
      }
      if (cmd === "/tools") {
        for (const tool of context.tools) console.log(`- ${tool.function.name}`);
        rl.prompt();
        return;
      }
      if (cmd === "/commands") {
        for (const name of Object.keys(context.commands)) console.log(`- ${name}`);
        rl.prompt();
        return;
      }
      if (cmd === "/call") {
        const { toolName, args } = parseCallInput(rest);
        console.log(formatOutput(await runDirectTool(context, toolName, args)));
        rl.prompt();
        return;
      }
      if (cmd === "/run") {
        const { commandName, args } = parseRunInput(rest);
        console.log(formatOutput(await runDirectCommand(context, commandName, args)));
        rl.prompt();
        return;
      }

      history.push({ role: "user", content: input });
      console.log(await askAgent(context.aiml, agentModel, context.tools, context.handlers, history));
      rl.prompt();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${message}`);
      rl.prompt();
    }
  });

  await new Promise<void>((resolve) => {
    rl.on("close", () => resolve());
  });
}

export async function startCli(): Promise<void> {
  const context = createContext();
  const argv = process.argv.slice(2);
  const wasOneShot = await runOneShot(context, argv);
  if (!wasOneShot) await runInteractive(context);
}
