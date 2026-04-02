# 3D Figures — Refactor Roadmap

This folder contains detailed task instructions for an AI coding agent to systematically refactor the MVP into a production-ready multi-user SaaS platform.

## Phases

| Phase | Title | Goal |
|-------|-------|------|
| [01](./01-database.md) | Database + Storage Layer | MongoDB collections with full asset hierarchy + GCS integration |
| [02](./02-auth.md) | Authentication & Multi-User | JWT auth, user accounts, per-user data isolation |
| [03](./03-react.md) | React Frontend | Vite + React SPA, feature-based folder structure |
| [04](./04-stripe.md) | Token Purchases & Billing | Stripe Checkout, token wallet, per-request deduction |

## Execution order

```
01-database → 02-auth → 03-react → 04-stripe
```

## Current state (MVP)

- Figures stored in `assets/figures/figures.json` — deeply nested JSON
- Skins embedded as arrays, images embedded in skins, models3d embedded in images, animations embedded in models
- Tripo CDN URLs are signed and expire — no archiving
- No user accounts, no auth, no billing
- Static HTML + vanilla JS frontend

## Actual data model (from figures.json)

```
Figure
  └── Skin (name, isBase — including the unnamed "default" skin)
        └── SkinVariant (variant: "A" | "B", prompt, negativePrompt, imageModel)
              └── SkinImage (sourceUrl, gcsUrl)           ← multiple per variant
                    └── Model3D (meshTaskId, pbrModelUrl, gcsModelUrl, status)
                          └── Animation (animationKey, glbUrl, gcsGlbUrl, status)
```

Every asset URL (AIML image, Tripo GLB, animated GLB) is archived to **Google Cloud Storage** immediately after generation. Tripo URLs expire; GCS URLs are permanent.

## Target stack

| Layer | Technology |
|-------|-----------|
| Database | MongoDB via Prisma ORM |
| Asset storage | Google Cloud Storage (`@google-cloud/storage`) |
| Auth | JWT (access + refresh), bcrypt, HTTP-only cookies |
| Backend structure | Module-based (`src/modules/<feature>/`) |
| Frontend | Vite + React 18 + TypeScript, feature-based (`client/src/features/<feature>/`) |
| Server state | TanStack Query v5 |
| Billing | Stripe Checkout + Webhooks, token wallet per user |

## Collections (MongoDB)

| Collection | Description |
|------------|-------------|
| `users` | User accounts, token balance |
| `refresh_tokens` | Refresh token rotation |
| `figures` | Top-level figure documents |
| `skins` | Skin variants per figure (isBase marks the default skin) |
| `skin_variants` | variantA / variantB per skin with prompt config |
| `skin_images` | Generated images per variant — multiple per variant |
| `models_3d` | Tripo 3D models generated from an image |
| `animations` | Animated GLBs per model (one per animationKey) |
| `token_purchases` | Stripe payment history |
