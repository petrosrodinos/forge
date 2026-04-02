# Phase 03 — React Frontend

**Goal:** Migrate the static HTML + vanilla JS frontend to a Vite + React 18 TypeScript SPA. Feature-based folder structure mirrors the backend module hierarchy. The asset viewer reflects the full depth: Figure → Skin → SkinVariant → Images → Model3D → Animations.

**Depends on:** Phase 02 (Auth endpoints, cookie sessions, full asset API).  
**Required before:** Phase 04 (Stripe billing UI).

---

## Target frontend structure

```
client/
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── src/
    ├── main.tsx
    ├── app/
    │   ├── App.tsx              # Providers + Router
    │   ├── router.tsx           # Route tree
    │   ├── providers.tsx        # QueryClient, AuthProvider, Toaster
    │   └── layout/
    │       ├── Shell.tsx        # Sidebar + main content area
    │       ├── TopBar.tsx       # Tabs, balance, user menu
    │       └── Sidebar.tsx      # Figure tree nav
    ├── features/
    │   ├── auth/
    │   │   ├── components/
    │   │   │   ├── LoginPage.tsx
    │   │   │   └── RegisterPage.tsx
    │   │   ├── hooks/
    │   │   │   └── useAuth.ts
    │   │   ├── api.ts
    │   │   ├── context.tsx      # AuthContext + AuthProvider
    │   │   └── types.ts
    │   ├── figures/
    │   │   ├── components/
    │   │   │   ├── FigureList.tsx      # Left-sidebar figure list
    │   │   │   ├── FigureCard.tsx
    │   │   │   └── FigureEditor.tsx    # Create/edit figure name+type
    │   │   ├── hooks/
    │   │   │   └── useFigures.ts
    │   │   ├── api.ts
    │   │   └── types.ts
    │   ├── skins/
    │   │   ├── components/
    │   │   │   ├── SkinTabs.tsx        # Tab strip: Base | SkinName ...
    │   │   │   ├── SkinPanel.tsx       # Shows VariantA + VariantB side by side
    │   │   │   └── SkinEditor.tsx      # Create/rename skin
    │   │   ├── hooks/
    │   │   │   └── useSkins.ts
    │   │   ├── api.ts
    │   │   └── types.ts
    │   ├── skin-variants/
    │   │   ├── components/
    │   │   │   ├── VariantPanel.tsx    # Prompt editor + image gallery + model list
    │   │   │   ├── PromptEditor.tsx    # model, prompt, negativePrompt fields + AI generate button
    │   │   │   └── ImageGrid.tsx       # Grid of SkinImages with model indicators
    │   │   ├── hooks/
    │   │   │   └── useSkinVariants.ts
    │   │   ├── api.ts
    │   │   └── types.ts
    │   ├── skin-images/
    │   │   ├── components/
    │   │   │   ├── ImageCard.tsx       # Thumbnail + "Run 3D Pipeline" button
    │   │   │   └── ImageUploader.tsx   # Drag-and-drop image upload
    │   │   ├── hooks/
    │   │   │   └── useSkinImages.ts
    │   │   ├── api.ts
    │   │   └── types.ts
    │   ├── models3d/
    │   │   ├── components/
    │   │   │   ├── ModelList.tsx       # List of Model3D records per image
    │   │   │   ├── ModelCard.tsx       # Status badge, GCS GLB viewer, animation list
    │   │   │   └── ModelViewer.tsx     # Wraps @google/model-viewer
    │   │   ├── hooks/
    │   │   │   └── useModels3D.ts
    │   │   ├── api.ts
    │   │   └── types.ts
    │   ├── animations/
    │   │   ├── components/
    │   │   │   ├── AnimationList.tsx   # Tabs per animationKey
    │   │   │   ├── AnimationPlayer.tsx # model-viewer with the animated GLB
    │   │   │   └── AnimationPicker.tsx # Preset selector for pipeline submission
    │   │   ├── hooks/
    │   │   │   └── useAnimations.ts
    │   │   ├── api.ts
    │   │   └── types.ts
    │   ├── pipeline/
    │   │   ├── components/
    │   │   │   ├── PipelinePanel.tsx   # "Run Pipeline" form
    │   │   │   └── PipelineProgress.tsx # SSE step progress display
    │   │   ├── hooks/
    │   │   │   └── usePipeline.ts      # SSE stream state
    │   │   ├── api.ts
    │   │   └── types.ts
    │   ├── chat/
    │   │   ├── components/
    │   │   │   ├── ChatPanel.tsx
    │   │   │   ├── ChatMessage.tsx
    │   │   │   └── ToolCallCard.tsx
    │   │   ├── hooks/
    │   │   │   └── useChat.ts
    │   │   ├── api.ts
    │   │   └── types.ts
    │   ├── image-gen/
    │   │   ├── components/
    │   │   │   ├── ImageGenPanel.tsx
    │   │   │   └── ModelSelector.tsx
    │   │   ├── hooks/
    │   │   │   └── useImageGen.ts
    │   │   ├── api.ts
    │   │   └── types.ts
    │   └── billing/              # Stub — fully built in Phase 04
    │       ├── components/
    │       │   └── BillingPage.tsx
    │       ├── api.ts
    │       └── types.ts
    └── shared/
        ├── components/
        │   └── ui/
        │       ├── Button.tsx
        │       ├── Input.tsx
        │       ├── Textarea.tsx
        │       ├── Tabs.tsx
        │       ├── Badge.tsx       # status: pending|processing|success|failed → colors
        │       ├── Spinner.tsx
        │       └── Toast.tsx       # thin wrapper over sonner
        ├── hooks/
        │   └── useSSE.ts           # reusable SSE async-generator hook
        ├── lib/
        │   ├── sse.ts              # parseSSE async generator
        │   ├── apiClient.ts        # fetch wrapper: 401 auto-refresh, 402 throw
        │   └── utils.ts            # cn(), formatDate()
        ├── constants/
        │   └── index.ts            # ANIMATION_PRESETS, PIPELINE_STEPS
        └── types/
            └── index.ts            # Shared DTOs mirroring backend types
```

---

## Tasks

### 1. Scaffold Vite app

```bash
npm create vite@latest client -- --template react-ts
cd client
npm install react-router-dom@6 @tanstack/react-query axios sonner clsx tailwind-merge
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

### 2. Tailwind config — preserve existing dark theme

`client/tailwind.config.js`:
```js
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#080810", panel: "#0d0d1a", border: "#1e1e3a",
        accent: "#7c3aed", "accent-light": "#a78bfa",
      },
      fontFamily: { mono: ["JetBrains Mono", "monospace"] },
    },
  },
};
```

Copy `public/css/styles.css` custom rules into `client/src/index.css`.

---

### 3. Vite config

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:3000" } },
  build:  { outDir: "../public", emptyOutDir: true },
});
```

---

### 4. Shared types — mirror the full asset hierarchy

`client/src/shared/types/index.ts`:

```ts
export interface Animation {
  id: string; model3dId: string; animationKey: string;
  gcsGlbUrl: string | null; status: string; error?: string; createdAt: string;
}

export interface Model3D {
  id: string; imageId: string; status: string; error?: string;
  gcsPbrModelUrl: string | null; gcsModelUrl: string | null;
  meshTaskId?: string; rigTaskId?: string;
  animations: Animation[];
  createdAt: string; updatedAt: string;
}

export interface SkinImage {
  id: string; variantId: string;
  sourceUrl: string; gcsUrl: string | null;
  models: Model3D[];
  createdAt: string;
}

export interface SkinVariant {
  id: string; skinId: string; variant: "A" | "B";
  prompt: string | null; negativePrompt: string | null; imageModel: string | null;
  images: SkinImage[];
}

export interface Skin {
  id: string; figureId: string; name: string | null; isBase: boolean;
  variants: SkinVariant[];
}

export interface Figure {
  id: string; name: string; type: string;
  skins: Skin[];
}

export interface User {
  id: string; email: string; displayName: string | null; tokenBalance: number;
}
```

---

### 5. API client with auto-refresh and 402 handling

`client/src/shared/lib/apiClient.ts`:

```ts
export class InsufficientTokensError extends Error {
  constructor(public required: number, public balance: number) { super("Insufficient tokens"); }
}

export async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  let res = await fetch(input, { credentials: "include", ...init });

  if (res.status === 401) {
    const r = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
    if (r.ok) res = await fetch(input, { credentials: "include", ...init });
    else { window.location.href = "/login"; throw new Error("Session expired"); }
  }

  if (res.status === 402) {
    const d = await res.json();
    throw new InsufficientTokensError(d.required, d.balance);
  }

  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}
```

---

### 6. SSE parser

`client/src/shared/lib/sse.ts`:

```ts
export async function* parseSSE(body: ReadableStream<Uint8Array>) {
  const reader  = body.getReader();
  const decoder = new TextDecoder();
  let buffer = ""; let eventName: string | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n"); buffer = parts.pop() ?? "";
    for (const part of parts) {
      let data = "";
      for (const line of part.split("\n")) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        if (line.startsWith("data:"))  data = line.slice(5).trim();
      }
      if (data) { yield { event: eventName, data }; eventName = undefined; }
    }
  }
}
```

---

### 7. Auth feature

`context.tsx` — `AuthContext + AuthProvider`:
- On mount: calls `GET /api/auth/me`. Sets `user` or `null`.
- `login(email, pw)` → `POST /api/auth/login` → re-fetch `me`.
- `logout()` → `POST /api/auth/logout` → clear state.

`hooks/useAuth.ts` — thin context consumer.

`components/LoginPage.tsx` + `RegisterPage.tsx` — dark-themed forms using `shared/components/ui/` primitives.

Route guard in `app/router.tsx`:
```tsx
function RequireAuth({ children }: PropsWithChildren) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user)   return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

---

### 8. Figures feature

`api.ts`:
```ts
export const listFigures   = ()       => apiFetch<Figure[]>("/api/figures");
export const createFigure  = (b: any) => apiFetch<Figure>("/api/figures", { method:"POST", ...json(b) });
export const updateFigure  = (id: string, b: any) => apiFetch<Figure>(`/api/figures/${id}`, { method:"PUT", ...json(b) });
export const deleteFigure  = (id: string) => apiFetch<void>(`/api/figures/${id}`, { method:"DELETE" });
```

`hooks/useFigures.ts` — TanStack Query: `queryKey: ["figures"]`, mutations invalidate on success.

`components/FigureList.tsx` — lists figures in the left sidebar. Clicking a figure sets the active figure and expands its skins.

---

### 9. Skins feature

`components/SkinTabs.tsx` — tab strip across the top of the figure editor: "Base", then each named skin. A "+" button to add a new skin.

`components/SkinPanel.tsx` — two-column layout: `VariantPanel` for A on the left, `VariantPanel` for B on the right.

---

### 10. SkinVariant feature

`components/VariantPanel.tsx`:
1. **Prompt editor** — `PromptEditor.tsx` with model selector, prompt textarea, negative prompt textarea, and an "AI Generate Prompt" button (calls `POST /api/figures/ai-variant`).
2. **Image grid** — `ImageGrid.tsx` — lists all `SkinImage` records for this variant, newest first. Each image shows:
   - Thumbnail (from `gcsUrl` or `sourceUrl`)
   - Count badge: `N models`
   - "Run Pipeline" button → opens `PipelinePanel`

---

### 11. SkinImages feature

`components/ImageCard.tsx`:
```tsx
<img src={image.gcsUrl ?? image.sourceUrl} className="w-full aspect-square object-cover rounded" />
<Badge status={bestModelStatus(image.models)} />
<Button onClick={() => onRunPipeline(image)}>Run 3D Pipeline</Button>
```

Where `bestModelStatus` returns the status of the most recent model or `"none"` if no models.

`components/ImageUploader.tsx` — drag-and-drop that calls `POST /api/pipeline` with a user-supplied image.

---

### 12. Model3D feature

`components/ModelCard.tsx`:
```tsx
<Badge status={model.status} />  // pending | processing | success | failed
{model.gcsPbrModelUrl && <ModelViewer src={model.gcsPbrModelUrl} />}
<AnimationList model3dId={model.id} animations={model.animations} />
```

`components/ModelViewer.tsx` — wraps `@google/model-viewer`:
```tsx
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string; "auto-rotate"?: boolean; "camera-controls"?: boolean;
          "shadow-intensity"?: string;
        },
        HTMLElement
      >;
    }
  }
}

export function ModelViewer({ src, animated = false }: { src: string; animated?: boolean }) {
  useEffect(() => { import("@google/model-viewer"); }, []);
  return (
    <model-viewer
      src={src}
      auto-rotate
      camera-controls
      shadow-intensity="1"
      className="w-full h-[360px] rounded-lg bg-panel"
    />
  );
}
```

---

### 13. Animations feature

`components/AnimationList.tsx` — tab strip per `animationKey`. Clicking a tab shows `AnimationPlayer` with the `gcsGlbUrl` loaded in `ModelViewer`.

`components/AnimationPicker.tsx` — multi-select checkboxes for choosing animation presets before running the pipeline. Populated from `ANIMATION_PRESETS` in `shared/constants/index.ts`.

`shared/constants/index.ts`:
```ts
export const ANIMATION_PRESETS = [
  { key: "preset:idle",   label: "Idle" },
  { key: "preset:walk",   label: "Walk" },
  { key: "preset:run",    label: "Run" },
  { key: "preset:shoot",  label: "Shoot" },
  { key: "preset:hurt",   label: "Hurt" },
  { key: "preset:death",  label: "Death" },
  { key: "preset:attack", label: "Attack" },
  // quadruped / aquatic / serpentine variants as in constants.js
] as const;
```

---

### 14. Pipeline feature

`hooks/usePipeline.ts`:

```ts
export interface PipelineStep { step: string; status: string; [k: string]: unknown }
export interface PipelineResult {
  model3dId: string;
  gcsPbrModelUrl: string;
  gcsModelUrl: string;
  animations: Array<{ animationKey: string; gcsGlbUrl: string; status: string }>;
}

export function usePipeline(onComplete: (r: PipelineResult) => void) {
  const [steps, setSteps]     = useState<PipelineStep[]>([]);
  const [running, setRunning] = useState(false);

  async function run(variantId: string, figureId: string, imageId: string, file: File | null, animations: string[]) {
    setRunning(true); setSteps([]);
    const form = new FormData();
    if (file) form.append("image", file);
    form.append("variantId",  variantId);
    form.append("figureId",   figureId);
    form.append("imageId",    imageId);
    animations.forEach(a => form.append("animations", a));

    const res = await fetch("/api/pipeline", { method: "POST", credentials: "include", body: form });

    for await (const evt of parseSSE(res.body!)) {
      const data = JSON.parse(evt.data);
      if (evt.event === "progress") setSteps(prev => [...prev, data]);
      if (evt.event === "complete") { onComplete(data); break; }
      if (evt.event === "error")    throw new Error(data.message);
    }
    setRunning(false);
  }

  return { steps, running, run };
}
```

`components/PipelineProgress.tsx` — renders `steps` as a vertical stepper with `Badge` for each step status. Shows `gcsGlbUrl` previews inline as animations complete.

---

### 15. Chat feature

`hooks/useChat.ts` — same SSE pattern as before. Streams `text-delta`, `tool-call`, `tool-result` events.

`components/ToolCallCard.tsx` — shows tool name + collapsible result JSON. This surfaces the AI agent's use of figure/skin/pipeline tools.

---

### 16. App layout — Forge layout (main view)

`app/layout/Shell.tsx` — three-column layout:
1. **Left**: `Sidebar` (`FigureList`) — select active figure
2. **Center**: `SkinTabs` + `SkinPanel` + `VariantPanel` — the figure editor
3. **Right**: Mode panel — tabs for Chat, Pipeline Progress, Image Gen

`app/layout/TopBar.tsx` — mode tabs, token balance, user menu (logout), "Buy tokens" link.

---

### 17. App router

`app/router.tsx`:
```tsx
<Routes>
  <Route path="/login"    element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route path="/" element={<RequireAuth><Shell /></RequireAuth>}>
    <Route index        element={<Navigate to="/forge" replace />} />
    <Route path="forge" element={<ForgeLayout />} />
    <Route path="billing" element={<BillingPage />} />
  </Route>
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

---

### 18. App providers

`app/providers.tsx`:
```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries:   { retry: 1, staleTime: 30_000 },
    mutations: {
      onError: (err) => {
        if (err instanceof InsufficientTokensError)
          toast.error(`Not enough tokens (need ${err.required}, have ${err.balance})`, {
            action: { label: "Buy tokens", onClick: () => (window.location.href = "/billing") },
          });
      },
    },
  },
});
```

---

### 19. Express SPA fallback in `src/server.ts`

```ts
import path from "path";
app.use(express.static(path.join(__dirname, "../public")));
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "../public/index.html")));
```

---

### 20. Build scripts — root `package.json`

```json
"scripts": {
  "client:dev":   "cd client && npm run dev",
  "client:build": "cd client && npm run build",
  "dev":          "concurrently \"npm run server\" \"npm run client:dev\"",
  "build":        "npm run client:build && npm run build:server",
  "build:server": "tsc"
}
```

---

### 21. Migration map

| Old file | New location |
|----------|-------------|
| `public/index.html` | `app/layout/Shell.tsx`, `app/layout/TopBar.tsx` |
| `public/forge.html` | `app/layout/Shell.tsx` (merged) |
| `public/js/app.js` | `app/App.tsx`, `app/router.tsx` |
| `public/js/api.js` | `shared/lib/apiClient.ts` + per-feature `api.ts` |
| `public/js/chat.js` | `features/chat/` |
| `public/js/pipeline.js` | `features/pipeline/` + `features/animations/` |
| `public/js/sidebar.js` | `features/figures/components/FigureList.tsx` |
| `public/js/state.js` | `features/auth/context.tsx` + TanStack Query |
| `public/js/constants.js` | `shared/constants/index.ts` |
| `public/js/utils.js` | `shared/lib/utils.ts` |

---

## Acceptance criteria

- [ ] Figure editor shows: base skin + named skins as tabs; each skin shows variant A and B side by side.
- [ ] Each variant shows: prompt editor, image grid (with `gcsUrl` thumbnails), model list per image.
- [ ] Each model shows: status badge, PBR GLB in model-viewer, animation tabs with `gcsGlbUrl` loaded.
- [ ] Animation picker lets the user choose multiple presets before running the pipeline.
- [ ] "Run Pipeline" SSE progress stepper updates in real time; on complete, inserts a new Model3D card.
- [ ] Chat tab streams and renders tool call cards.
- [ ] Image gen tab creates an image and it appears in the variant's image grid (linked to the variant).
- [ ] All asset thumbnails and 3D model sources use `gcsUrl` / `gcsGlbUrl` — never raw Tripo signed URLs.
- [ ] `InsufficientTokensError` shows toast with "Buy tokens" action.
- [ ] No feature imports from another feature folder.
- [ ] `npm run client:build` produces working SPA in `public/`.
