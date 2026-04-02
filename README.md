# 3D Figures

A small TypeScript app for turning images into 3D assets and animations.  
It can be used directly from the terminal or operated through an AI coding agent such as Cursor or Claude.

It includes:

- A local web app (`The Forge`) for chat/pipeline flows
- A CLI pipeline to convert an image into an animated `.glb`
- A unified agent CLI for running supported service actions

## Requirements

- Node.js 18+ (recommended)
- API keys for:
  - `TRIPO_API_KEY`
  - `AIML_API_KEY`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create/update `.env` in the project root:

```env
TRIPO_API_KEY=your_tripo_key
AIML_API_KEY=your_aiml_key
PORT=3000
```

## Run the app (web server)

```bash
npm run server
```

Then open [http://localhost:3000](http://localhost:3000).

## Convert an image to an animated GLB

Use the included script:

```bash
npm run tripo:image-to-animated-glb -- "output/red-goth-pony.png"
```

Optional arguments:

- 1st arg: input image path (`.png`, `.jpg`, `.jpeg`)
- 2nd arg: output `.glb` path
- 3rd arg: output metadata `.json` path

If omitted, output files are created under `output/<image-name>/`.

## Agent CLI (optional)

Use the project CLI for direct service commands:

```bash
npm run agent -- commands
npm run agent -- run tripo.getTask taskId="your-task-id"
```

When using Cursor or Claude, you can ask the agent to run these same commands for you and guide the full pipeline end-to-end.

## Useful scripts

- `npm run server` - start local web app
- `npm run dev` - run `src/index.ts`
- `npm run build` - compile TypeScript
- `npm run agent` - run Agent CLI
- `npm run tripo:image-to-animated-glb` - image -> animated GLB pipeline

# OpenAPI / Swagger

- Swagger UI: `/api/docs`
- Raw OpenAPI JSON: `/api/openapi.json`

The OpenAPI source document is defined in `src/docs/openapi.ts`.
