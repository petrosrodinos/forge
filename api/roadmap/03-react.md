# Phase 03 — React Frontend

**Goal:** Migrate the static HTML + vanilla JS frontend to a Vite + React 18 TypeScript SPA. Feature-based folder structure mirrors the backend module hierarchy. The asset viewer reflects the full depth: Figure → Skin → SkinVariant → Images → Model3D → Animations.

**Depends on:** Phase 02 (Auth endpoints, cookie sessions, full asset API).  
**Required before:** Phase 04 (Stripe billing UI).

---

## Target frontend structure

```
src/
├── assets/             # Static files (images, svgs, fonts)
├── components/         # Globally reusable UI components
│   └── ui/             # Primitives: Button, Input, Modal, Badge, etc.
│   └── layouts/            # Layout wrappers (AppLayout, AuthLayout)
│   └── providers/ (providers that are used in the app, tanstack query client, zustand store, etc.)
├── features/           # Feature-scoped, self-contained modules
│   └── [feature]/
│       ├── interfaces/ (interfaces that are used in the feature)
        |       └── [entity-name.interfaces.ts].ts (1 interfaces file, user.interfaces.ts)
│       ├── hooks/ (tanstack query only that calls the services)
              |       └── [use-entity-name.hooks.ts].ts (1 hooks file, use-users.hooks.ts)
│       ├── services/ (axios services that implement the api endpoints)
                |       └── [entity-name.services.ts].ts (1 service file, users.services.ts)
├── hooks/              # Shared custom hooks
├── pages/              # One file per route at index.tsx file
   └── components/ (components that are used in the page)
        ----component-name (folder with the component and optional children components)
          ----index.tsx (component file)
          ----component-child.tsx (optional component child file)
   └── subpages/ (subpages that are used in the page)
        ----components/ (components that are used in the subpage)
        ----index.tsx (subpage component)
   └── hooks/ (hooks that are used in the page)
   └── utils/ (utils that are used in the page)
   └── constants/ (constants that are used in the page)
   └── interfaces/ (interfaces that are used in the page)
   └── index.tsx (page component)
├── routes/             # One file per route at route.ts file
├── services/           # Global shared services functions that are not from the api
├── store/              # Global state slices
├── interfaces/              # Global TypeScript types/interfaces/enums
└── utils/
    ├── constants.ts    # App-wide constants (SCREAMING_SNAKE_CASE)
    ├── format.ts       # Date, number, string formatters
    ├── helpers.ts      # General-purpose helpers
    └── validation.ts   # Input validators
```

---

## Tasks

### 1. Scaffold Vite app

```bash
(already initialized in the project)
npm install react-router-dom@6 @tanstack/react-query axios sonner clsx tailwind-merge lucide-react
```

---

### 2. Tailwind config — preserve existing dark theme

Tailwind v4 is config-free. Add design tokens directly in `src/index.css`:

```css
@import "tailwindcss";

@theme {
  --color-surface: #080810;
  --color-panel: #0d0d1a;
  --color-border: #1e1e3a;
  --color-accent: #7c3aed;
  --color-accent-light: #a78bfa;
  --font-family-mono: "JetBrains Mono", monospace;
}
```

Copy `public/css/styles.css` custom rules below the `@theme` block.

---

### 3. Vite config

```ts
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { proxy: { "/api": "http://localhost:3000" } },
  build: { outDir: "../public", emptyOutDir: true },
});
```

---

### 4. Global interfaces — mirror the full asset hierarchy

`client/src/interfaces/index.ts`:

```ts
export interface Animation {
  id: string;
  model3dId: string;
  animationKey: string;
  gcsGlbUrl: string | null;
  status: string;
  error?: string;
  createdAt: string;
}

export interface Model3D {
  id: string;
  imageId: string;
  status: string;
  error?: string;
  gcsPbrModelUrl: string | null;
  gcsModelUrl: string | null;
  meshTaskId?: string;
  rigTaskId?: string;
  animations: Animation[];
  createdAt: string;
  updatedAt: string;
}

export interface SkinImage {
  id: string;
  variantId: string;
  sourceUrl: string;
  gcsUrl: string | null;
  models: Model3D[];
  createdAt: string;
}

export interface SkinVariant {
  id: string;
  skinId: string;
  variant: "A" | "B";
  prompt: string | null;
  negativePrompt: string | null;
  imageModel: string | null;
  images: SkinImage[];
}

export interface Skin {
  id: string;
  figureId: string;
  name: string | null;
  isBase: boolean;
  variants: SkinVariant[];
}

export interface Figure {
  id: string;
  name: string;
  type: string;
  skins: Skin[];
}

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  tokenBalance: number;
}
```

---

### 5. API client with auto-refresh and 402 handling

`client/src/utils/apiClient.ts`:

```ts
export class InsufficientTokensError extends Error {
  constructor(
    public required: number,
    public balance: number,
  ) {
    super("Insufficient tokens");
  }
}

export async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  let res = await fetch(input, { credentials: "include", ...init });

  if (res.status === 401) {
    const r = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
    if (r.ok) res = await fetch(input, { credentials: "include", ...init });
    else {
      window.location.href = "/login";
      throw new Error("Session expired");
    }
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

`client/src/hooks/useSSE.ts`:

```ts
export async function* parseSSE(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventName: string | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      let data = "";
      for (const line of part.split("\n")) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        if (line.startsWith("data:")) data = line.slice(5).trim();
      }
      if (data) {
        yield { event: eventName, data };
        eventName = undefined;
      }
    }
  }
}
```

---

### 7. Auth feature

`components/providers/AuthProvider.tsx` — `AuthContext + AuthProvider`:

- On mount: calls `GET /api/auth/me`. Sets `user` or `null`.
- `login(email, pw)` → `POST /api/auth/login` → re-fetch `me`.
- `logout()` → `POST /api/auth/logout` → clear state.

`features/auth/hooks/use-auth.hooks.ts` — thin context consumer.

`pages/login/index.tsx` + `pages/register/index.tsx` — dark-themed forms using `components/ui/` primitives.

Route guard in `routes/routes.tsx`:

```tsx
function RequireAuth({ children }: PropsWithChildren) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

---

### 8. Figures feature

`features/figures/services/figures.services.ts`:

```ts
export const listFigures = () => apiFetch<Figure[]>("/api/figures");
export const createFigure = (b: CreateFigureDto) => apiFetch<Figure>("/api/figures", { method: "POST", ...json(b) });
export const updateFigure = (id: string, b: UpdateFigureDto) => apiFetch<Figure>(`/api/figures/${id}`, { method: "PUT", ...json(b) });
export const deleteFigure = (id: string) => apiFetch<void>(`/api/figures/${id}`, { method: "DELETE" });
```

`features/figures/hooks/use-figures.hooks.ts` — TanStack Query: `queryKey: ["figures"]`, mutations invalidate on success.

`pages/forge/components/figure-list/index.tsx` — lists figures in the left sidebar. Clicking a figure sets the active figure and expands its skins.

---

### 9. Skins feature

`pages/forge/components/skin-tabs/index.tsx` — tab strip across the top of the figure editor: "Base", then each named skin. A "+" button to add a new skin.

`pages/forge/components/skin-panel/index.tsx` — two-column layout: `variant-panel` for A on the left, `variant-panel` for B on the right.

---

### 10. SkinVariant feature

`pages/forge/components/skin-panel/variant-panel.tsx`:

1. **Prompt editor** — `prompt-editor/index.tsx` with model selector, prompt textarea, negative prompt textarea, and an "AI Generate Prompt" button (calls `POST /api/figures/ai-variant`).
2. **Image grid** — `image-grid/index.tsx` — lists all `SkinImage` records for this variant, newest first. Each image shows:
   - Thumbnail (from `gcsUrl` or `sourceUrl`)
   - Count badge: `N models`
   - "Run Pipeline" button → opens `pipeline-panel`

---

### 11. SkinImages feature

`pages/forge/components/image-grid/image-card.tsx`:

```tsx
<img src={image.gcsUrl ?? image.sourceUrl} className="w-full aspect-square object-cover rounded" />
<Badge status={bestModelStatus(image.models)} />
<Button onClick={() => onRunPipeline(image)}>Run 3D Pipeline</Button>
```

Where `bestModelStatus` returns the status of the most recent model or `"none"` if no models.

`pages/forge/components/image-uploader/index.tsx` — drag-and-drop that calls `POST /api/pipeline` with a user-supplied image.

---

### 12. Model3D feature

`pages/forge/components/model-card/index.tsx`:

```tsx
<Badge status={model.status} />  {/* pending | processing | success | failed */}
{model.gcsPbrModelUrl && <ModelViewer src={model.gcsPbrModelUrl} />}
<AnimationList model3dId={model.id} animations={model.animations} />
```

`pages/forge/components/model-card/model-viewer.tsx` — wraps `@google/model-viewer`:

```tsx
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          "auto-rotate"?: boolean;
          "camera-controls"?: boolean;
          "shadow-intensity"?: string;
        },
        HTMLElement
      >;
    }
  }
}

export function ModelViewer({ src, animated = false }: { src: string; animated?: boolean }) {
  useEffect(() => {
    import("@google/model-viewer");
  }, []);
  return <model-viewer src={src} auto-rotate camera-controls shadow-intensity="1" className="w-full h-[360px] rounded-lg bg-panel" />;
}
```

---

### 13. Animations feature

`pages/forge/components/animation-list/index.tsx` — tab strip per `animationKey`. Clicking a tab shows `animation-player` with the `gcsGlbUrl` loaded in `ModelViewer`.

`pages/forge/components/animation-list/animation-picker.tsx` — multi-select checkboxes for choosing animation presets before running the pipeline. Populated from `ANIMATION_PRESETS` in `utils/constants.ts`.

`utils/constants.ts`:

```ts
export const ANIMATION_PRESETS = [
  { key: "preset:idle", label: "Idle" },
  { key: "preset:walk", label: "Walk" },
  { key: "preset:run", label: "Run" },
  { key: "preset:shoot", label: "Shoot" },
  { key: "preset:hurt", label: "Hurt" },
  { key: "preset:death", label: "Death" },
  { key: "preset:attack", label: "Attack" },
  // quadruped / aquatic / serpentine variants as in constants.js
] as const;
```

---

### 14. Pipeline feature

`features/pipeline/hooks/use-pipeline.hooks.ts`:

```ts
export interface PipelineStep {
  step: string;
  status: string;
  [k: string]: unknown;
}
export interface PipelineResult {
  model3dId: string;
  gcsPbrModelUrl: string;
  gcsModelUrl: string;
  animations: Array<{ animationKey: string; gcsGlbUrl: string; status: string }>;
}

export function usePipeline(onComplete: (r: PipelineResult) => void) {
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [running, setRunning] = useState(false);

  async function run(variantId: string, figureId: string, imageId: string, file: File | null, animations: string[]) {
    setRunning(true);
    setSteps([]);
    const form = new FormData();
    if (file) form.append("image", file);
    form.append("variantId", variantId);
    form.append("figureId", figureId);
    form.append("imageId", imageId);
    animations.forEach((a) => form.append("animations", a));

    const res = await fetch("/api/pipeline", { method: "POST", credentials: "include", body: form });

    for await (const evt of parseSSE(res.body!)) {
      const data = JSON.parse(evt.data);
      if (evt.event === "progress") setSteps((prev) => [...prev, data]);
      if (evt.event === "complete") {
        onComplete(data);
        break;
      }
      if (evt.event === "error") throw new Error(data.message);
    }
    setRunning(false);
  }

  return { steps, running, run };
}
```

`pages/forge/components/pipeline-panel/pipeline-progress.tsx` — renders `steps` as a vertical stepper with `Badge` for each step status. Shows `gcsGlbUrl` previews inline as animations complete.

---

### 15. Chat feature

`features/chat/hooks/use-chat.hooks.ts` — same SSE pattern as pipeline. Streams `text-delta`, `tool-call`, `tool-result` events.

`pages/forge/components/chat-panel/tool-call-card.tsx` — shows tool name + collapsible result JSON. This surfaces the AI agent's use of figure/skin/pipeline tools.

---

### 16. App layout — Forge layout (main view)

`components/layouts/Shell.tsx` — three-column layout:

1. **Left**: `Sidebar` (`figure-list`) — select active figure
2. **Center**: `skin-tabs` + `skin-panel` + `variant-panel` — the figure editor
3. **Right**: Mode panel — tabs for Chat, Pipeline Progress, Image Gen

`components/layouts/TopBar.tsx` — mode tabs, token balance, user menu (logout), "Buy tokens" link.

---

### 17. App router

`routes/routes.tsx`:

```tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route
    path="/"
    element={
      <RequireAuth>
        <Shell />
      </RequireAuth>
    }
  >
    <Route index element={<Navigate to="/forge" replace />} />
    <Route path="forge" element={<ForgePage />} />
    <Route path="billing" element={<BillingPage />} />
  </Route>
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

---

### 18. App providers

`components/providers/AppProviders.tsx`:

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
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

| Old file                 | New location                                                    |
| ------------------------ | --------------------------------------------------------------- |
| `public/index.html`      | `components/layouts/Shell.tsx`, `components/layouts/TopBar.tsx` |
| `public/forge.html`      | `components/layouts/Shell.tsx` (merged)                         |
| `public/js/app.js`       | `main.tsx`, `routes/routes.tsx`                                 |
| `public/js/api.js`       | `utils/apiClient.ts` + per-feature `services/*.services.ts`     |
| `public/js/chat.js`      | `features/chat/` + `pages/forge/components/chat-panel/`         |
| `public/js/pipeline.js`  | `features/pipeline/` + `pages/forge/components/pipeline-panel/` |
| `public/js/sidebar.js`   | `pages/forge/components/figure-list/index.tsx`                  |
| `public/js/state.js`     | `components/providers/AuthProvider.tsx` + TanStack Query        |
| `public/js/constants.js` | `utils/constants.ts`                                            |
| `public/js/utils.js`     | `utils/helpers.ts`, `utils/format.ts`, `utils/cn.ts`            |

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
