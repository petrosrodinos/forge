# AI Agent CLI Guide

This project includes an interactive CLI agent that can interpret your instructions and call the existing service methods in:

- `AimlApiService`
- `TripoService`

The CLI lives at `src/cli.ts` and runs with `npm run agent`.

## 1) Prerequisites

- Node.js installed
- Dependencies installed:

```bash
npm install
```

## 2) Environment setup

Create a `.env` file in the project root:

```env
AIML_API_KEY=your_aiml_api_key
TRIPO_API_KEY=your_tripo_api_key
AGENT_MODEL=gpt-4o-mini
```

Notes:

- `AIML_API_KEY` is required for AIML calls and for the planner model.
- `TRIPO_API_KEY` is required for Tripo calls.
- `AGENT_MODEL` is optional. If omitted, it defaults to `gpt-4o-mini`.

## 3) Start the agent

```bash
npm run agent
```

You will see:

- Interactive prompt: `agent>`
- Available commands help text

## 4) Core commands

- `/help`  
  Show command help.

- `/tools`  
  List all callable tool names exposed by the CLI.

- `/commands`  
  List all direct service commands in `service.method` format.

- `/call <toolName> <json>`  
  Execute a specific tool directly with JSON args.

- `/run <service.method> <args>`  
  Execute service methods directly with either JSON object args or `key=value` args.

- `/exit`  
  Quit the CLI.

## 5) Two usage modes

### A) Natural language mode

Type normal instructions at `agent>` and the planner will choose tool calls automatically.

Examples:

- `list available AIML models`
- `create a tripo text_to_model task for "a low-poly robot"`  
- `check task status for 123456789`
- `generate an image with model flux and prompt "cyberpunk owl"`

### B) Direct tool mode

Call methods explicitly:

```bash
/call tripo_getTask {"taskId":"your_task_id"}
/call aiml_listModels {}
/run tripo.getTask {"taskId":"your_task_id"}
/run tripo.getTask taskId="your_task_id"
/run aiml.generateImage model="flux" prompt="robot figurine" size="1024x1024"
/call aiml_getBalance {}
```

Use `/tools` first to see exact tool names available in your build.

New file-based helpers:

```bash
/call tripo_uploadImageFromPath {"filePath":"./assets/cat.png"}
/call aiml_transcribeFile {"model":"gpt-4o-mini-transcribe","filePath":"./audio/note.wav"}
/call aiml_textToSpeechToFile {"model":"gpt-4o-mini-tts","voice":"alloy","input":"hello world","outputPath":"./out/hello.mp3"}
/call aiml_generateImageToFile {"model":"flux","prompt":"robot figurine","outputPath":"./out/robot.png"}
```

## 6) Typical workflow

1. Start CLI with `npm run agent`
2. Ask the agent to create a task
3. Ask it to poll/check status
4. Ask for follow-up calls (balance, models, generation status, etc.)

You can also run one-shot commands without entering interactive mode:

```bash
npm run agent -- commands
npm run agent -- run aiml.listModels
npm run agent -- run tripo.getTask taskId="your_task_id"
npm run agent -- call tripo_getTask {"taskId":"your_task_id"}
```

Example flow:

```text
agent> create a tripo text_to_model task for "a red dragon figurine"
agent> poll that task until done
agent> show my tripo balance
```

## 7) Troubleshooting

- **Missing environment variable error**
  - Ensure `.env` exists in project root.
  - Ensure `AIML_API_KEY` and `TRIPO_API_KEY` are set.

- **Unknown tool in `/call`**
  - Run `/tools` and copy the exact tool name.

- **API request fails**
  - Verify key validity and service availability.
  - Retry with a simpler payload to isolate input issues.

## 8) Important behavior

- Natural-language requests are resolved through AIML chat-completions + tool-calling.
- `/call` bypasses planning and executes the selected service method directly.
- The agent uses your local project services, so responses reflect current implementation.
