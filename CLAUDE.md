# Project instructions

This file mirrors `.cursor/rules/*.mdc` for Claude Code. Keep it in sync when rules change.

## Tripo: image → animated GLB

Pipeline: `uploadFile` → `createTask` + `pollTask` for each step.

1. **Upload** — `uploadFile(buffer, filename, "image/png"|"image/jpeg")` → `file_token` in `data`.
2. **Mesh** — `createTask({ type: "image_to_model", file: { type: "png"|"jpeg", file_token }, ... })` → poll → `output.model` / `pbr_model`. Multiview: `multiview_to_model`, `files: File[]`.
3. **Pre-rig** — `{ type: "animate_prerigcheck", original_model_task_id }` → poll → require `output.riggable`.
4. **Rig** — `{ type: "animate_rig", original_model_task_id, out_format?, spec?, topology?, model_version? }` → poll → use **this task’s `task_id`** as `original_model_task_id` for step 5.
5. **Animate** — `{ type: "animate_retarget", original_model_task_id: rigTaskId, animation?: AnimationType | animations?: AnimationType[], out_format?, bake_animation?, export_with_geometry? }` — use **either** `animation` **or** `animations`, not both. Presets include `preset:idle`, `preset:walk`, `preset:run`, quadruped/hexapod/octopod walks, `preset:serpentine:march`, `preset:aquatic:march`, etc.

**CLI:** `tripo.uploadImageFromPath` then `tripo.createTask` with JSON body; `tripo.pollTask` with `taskId`, optional `intervalMs`/`timeoutMs`.

**Statuses:** `pollTask` resolves on `success`; throws on `failed`, `cancelled`, `banned`, `expired`.

**Types:** See `src/trippo/types.ts` (`ImageToModelRequest`, `AnimatePrerigcheckRequest`, `AnimateRigRequest`, `AnimateRetargetRequest`).

## Agent CLI

Entry: `npm run agent` (`src/cli.ts` → `src/cli/`). Requires `.env`: `AIML_API_KEY`, `TRIPO_API_KEY`; optional `AGENT_MODEL` (default `gpt-4o-mini`).

**Discover:** `npm run agent -- commands` | `npm run agent -- tools` — interactive: `/commands`, `/tools`.

**Direct (preferred for known calls):** `npm run agent -- run <service.method> <args>` — args as JSON object or `key=value` (quote strings with spaces). Example: `run tripo.getTask taskId="..."`.

**Low-level tools:** `npm run agent -- call <tool_name> <json>` — interactive: `/call tripo_getTask {"taskId":"..."}`.

**Interactive:** plain text at `agent>` = AI planner + tool calls; `/run` and `/call` skip the planner.

**File helpers (tool names):** `tripo_uploadImageFromPath`, `aiml_transcribeFile`, `aiml_textToSpeechToFile`, `aiml_generateImageToFile` — use `filePath` / `outputPath` relative to cwd.

**Troubles:** missing key → fix `.env`; unknown tool → `/tools`; bad `/call` → JSON must be a single object.

Align with the CLI tool-calling section below for agent behavior (prefer `run`, then planner, then `call`).

## CLI tool-calling

Use this project's CLI (`npm run agent`) as the primary interface for operational API actions.

- Prefer direct service execution first with:
  - `npm run agent -- run <service.method> <args>`
  - Interactive: `/run <service.method> <args>`
- Use AI planning only when the request is ambiguous or multi-step:
  - Interactive natural language at `agent>`
- Use tool names only when needed:
  - `npm run agent -- call <tool_name> <json>`
  - Interactive: `/call <tool_name> <json>`

### Command discovery

- List direct commands: `npm run agent -- commands` or `/commands`
- List tools: `npm run agent -- tools` or `/tools`

### Argument rules

- Accept either JSON object args or `key=value` args for `/run`.
- Prefer JSON for nested payloads.
- Keep names aligned with service contracts, for example:
  - `tripo.getTask taskId="..."`
  - `aiml.generateImage model="..." prompt="..."`
- Quote strings with spaces.

### Safety and reliability

- Require env vars before usage: `AIML_API_KEY`, `TRIPO_API_KEY`.
- Never invent missing required params; ask for them.
- For polling actions, pass explicit `intervalMs` and `timeoutMs` when long-running.
- Return concise output plus the exact command used when useful for reproducibility.
