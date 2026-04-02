# Claude Code — Project Rules

## Stack

React 19 + TypeScript + Vite. **Tailwind CSS v4** for styling (via `@tailwindcss/vite` plugin).

---

## Folder Structure

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

## Non-Negotiable Rules

### Components

- One component per file. Filename = component name (PascalCase).
- Props interface named `[ComponentName]Props`, defined in the same file.
- Named exports for components. Default export only for pages.
- No business logic in JSX — extract to hooks or utils.
- Co-locate CSS Module with the component: `Card.tsx` + `Card.module.css`.
- Components over ~150 lines need to be split.

### Hooks

- All hooks prefixed `use` and live in `src/hooks/` or `features/[x]/hooks/`.
- One responsibility per hook. Split if it does two things.
- Return plain objects `{ value, handler }`, not positional arrays.
- Data fetching happens in hooks — never directly in components.

### Services / API

- Base API client in `src/lib/api.ts` (Axios instance or fetch wrapper).
- One service file per resource: `userService.ts`, `authService.ts`.
- Service functions are pure async functions — no React, no state.
- Never call `fetch` or `axios` directly inside components or hooks.

### Utils

- Pure functions only — no side effects, no React imports.
- Named exports only. Group by concern (`format.ts`, `validation.ts`).
- Constants go in `utils/constants.ts` using `SCREAMING_SNAKE_CASE`.

### TypeScript

- No `any`. Use `unknown` and narrow.
- All function signatures fully typed (params + return type).
- Use `interface` for object shapes, `type` for unions/intersections.
- Use `@/` path alias for all imports. No deep relative paths (`../../../`).

### State

- Local UI state: `useState` or `useReducer`.
- Shared/global state: Zustand in `src/store/`.
- Server/async state: React Query or SWR hooks — not duplicated in global store.
- Never store derived data — compute from source.

### Pages

- Pages compose layouts and features. No raw business logic.
- Named `[Resource]Page.tsx` — e.g. `UsersPage.tsx`, `ProductDetailPage.tsx`.

---

## Naming Conventions

| Thing       | Convention      | Example              |
| ----------- | --------------- | -------------------- |
| Components  | PascalCase      | `UserCard.tsx`       |
| Hooks       | camelCase       | `useUserData.ts`     |
| Services    | camelCase       | `userService.ts`     |
| Utils       | camelCase       | `format.ts`          |
| Types       | PascalCase      | `UserProfile`        |
| Constants   | SCREAMING_SNAKE | `MAX_RETRY_COUNT`    |
| CSS classes | camelCase       | `styles.cardWrapper` |

---

## Styling Rules (Tailwind CSS v4)

- Use **Tailwind utility classes** for all styling. No inline `style={{}}` props.
- Custom design tokens (colors, fonts, spacing) go in `index.css` under `@theme` — not in arbitrary `[]` values scattered across components.
- For complex or repeated class combinations, extract to a component — do not use `@apply`.
- Responsive variants follow mobile-first order: base → `sm:` → `md:` → `lg:`.
- Dark mode via `dark:` variant — never duplicate styles in a media query.
- Conditional classes use the `cn()` helper (from `@/utils/cn.ts`) — never string concatenation.
- Do not mix Tailwind with CSS Modules in the same component.

---

## What Claude Should NOT Do

- Do not add barrel `index.ts` re-export files unless explicitly asked.
- Do not add prop drilling past 2 levels — suggest context/store instead.
- Do not use inline `style={{}}` props — use Tailwind classes.
- Do not use `useEffect` for derived state — compute inline or with `useMemo`.
- Do not add error handling for scenarios that cannot happen.
- Do not add extra features, abstractions, or "nice-to-haves" beyond what is asked.
- Do not add docstrings/comments to code that wasn't changed.
- Do not hardcode strings in JSX — use constants.
- Do not mock internal APIs in tests — use real service layer.
