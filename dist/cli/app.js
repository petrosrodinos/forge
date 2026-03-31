"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCli = startCli;
const readline_1 = __importDefault(require("readline"));
const AimlApiService_1 = require("../aimlapi/AimlApiService");
const TripoService_1 = require("../trippo/TripoService");
const env_1 = require("../env");
const agent_1 = require("./agent");
const commandRegistry_1 = require("./commandRegistry");
const parser_1 = require("./parser");
const toolRegistry_1 = require("./toolRegistry");
function printHelp() {
    console.log("Commands:");
    console.log("  /help                               Show help");
    console.log("  /tools                              List callable AI tools");
    console.log("  /commands                           List direct service commands");
    console.log('  /call <tool> <json>                 Call tool directly, ex: /call tripo_getTask {"taskId":"..."}');
    console.log('  /run <service.method> <args>        Run direct command, ex: /run tripo.getTask taskId="..."');
    console.log("  /exit                               Exit");
    console.log("Natural language input uses AI planning + tool calls.");
}
function createContext() {
    const aiml = new AimlApiService_1.AimlApiService();
    const tripo = new TripoService_1.TripoService();
    const tools = (0, toolRegistry_1.buildToolDefs)();
    const handlers = (0, toolRegistry_1.makeHandlers)(aiml, tripo);
    const commands = (0, commandRegistry_1.buildServiceCommands)(handlers);
    return { aiml, tripo, tools, handlers, commands };
}
async function runDirectCommand(context, commandName, args) {
    const command = context.commands[commandName];
    if (!command)
        throw new Error(`Unknown command: ${commandName}`);
    return command.execute(args);
}
async function runDirectTool(context, toolName, args) {
    const handler = context.handlers[toolName];
    if (!handler)
        throw new Error(`Unknown tool: ${toolName}`);
    return handler(args);
}
async function runOneShot(context, argv) {
    if (!argv.length)
        return false;
    const mode = argv[0];
    if (mode === "tools") {
        for (const tool of context.tools)
            console.log(`- ${tool.function.name}`);
        return true;
    }
    if (mode === "commands") {
        for (const name of Object.keys(context.commands))
            console.log(`- ${name}`);
        return true;
    }
    if (mode === "call") {
        const rest = argv.slice(1).join(" ").trim();
        const { toolName, args } = (0, parser_1.parseCallInput)(rest);
        console.log((0, parser_1.formatOutput)(await runDirectTool(context, toolName, args)));
        return true;
    }
    if (mode === "run") {
        const rest = argv.slice(1).join(" ").trim();
        const { commandName, args } = (0, parser_1.parseRunInput)(rest);
        console.log((0, parser_1.formatOutput)(await runDirectCommand(context, commandName, args)));
        return true;
    }
    return false;
}
async function runInteractive(context) {
    const agentModel = process.env.AGENT_MODEL || "gpt-4o-mini";
    const history = [
        {
            role: "system",
            content: "You are an API operations agent. Use tools to execute user requests against AIML and Tripo services. Prefer tools over guessing. Ask concise clarification only when required parameters are missing.",
        },
    ];
    const rl = readline_1.default.createInterface({ input: process.stdin, output: process.stdout, prompt: "agent> " });
    console.log("Interactive coding agent CLI");
    console.log(`Planner model: ${agentModel}`);
    console.log(`Loaded env: AIML_API_KEY=${Boolean((0, env_1.requireEnv)("AIML_API_KEY"))}, TRIPO_API_KEY=${Boolean((0, env_1.requireEnv)("TRIPO_API_KEY"))}`);
    printHelp();
    rl.prompt();
    rl.on("line", async (line) => {
        const input = line.trim();
        if (!input) {
            rl.prompt();
            return;
        }
        try {
            const { cmd, rest } = (0, parser_1.splitCommand)(input);
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
                for (const tool of context.tools)
                    console.log(`- ${tool.function.name}`);
                rl.prompt();
                return;
            }
            if (cmd === "/commands") {
                for (const name of Object.keys(context.commands))
                    console.log(`- ${name}`);
                rl.prompt();
                return;
            }
            if (cmd === "/call") {
                const { toolName, args } = (0, parser_1.parseCallInput)(rest);
                console.log((0, parser_1.formatOutput)(await runDirectTool(context, toolName, args)));
                rl.prompt();
                return;
            }
            if (cmd === "/run") {
                const { commandName, args } = (0, parser_1.parseRunInput)(rest);
                console.log((0, parser_1.formatOutput)(await runDirectCommand(context, commandName, args)));
                rl.prompt();
                return;
            }
            history.push({ role: "user", content: input });
            console.log(await (0, agent_1.askAgent)(context.aiml, agentModel, context.tools, context.handlers, history));
            rl.prompt();
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`Error: ${message}`);
            rl.prompt();
        }
    });
    await new Promise((resolve) => {
        rl.on("close", () => resolve());
    });
}
async function startCli() {
    const context = createContext();
    const argv = process.argv.slice(2);
    const wasOneShot = await runOneShot(context, argv);
    if (!wasOneShot)
        await runInteractive(context);
}
