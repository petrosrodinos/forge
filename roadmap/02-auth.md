# Phase 02 — Authentication & Multi-User Support

**Goal:** Add user accounts with JWT authentication. Scope all figures, skins, and assets to the authenticated user. Every API route requires a valid access token cookie.

**Depends on:** Phase 01 (all collections and GCS in place).  
**Required before:** Phase 03 (React needs login/register pages).

---

## New collections added this phase

| Collection | Note |
|-----------|------|
| `users` | Email, bcrypt password hash, token balance |
| `refresh_tokens` | One per session, rotated on each use |

All existing collections gain a `userId` field (added to `Figure` only — lower collections are already scoped via cascade FKs).

---

## New module structure

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.router.ts      # /api/auth/register|login|refresh|logout|me
│   │   ├── auth.service.ts     # register, login, refresh, logout logic
│   │   └── auth.types.ts
│   └── users/
│       ├── users.service.ts    # findById, findByEmail, createUser, updateBalance (no router)
│       └── users.types.ts
├── middleware/
│   └── requireAuth.ts          # verifies access token cookie, sets req.userId
└── lib/
    └── jwt.ts                  # sign/verify tokens, cookie options
```

---

## Tasks

### 1. Install dependencies

```bash
npm install bcryptjs jsonwebtoken cookie-parser
npm install --save-dev @types/bcryptjs @types/jsonwebtoken @types/cookie-parser
```

---

### 2. Extend env schema

`src/config/env.ts` — add to Zod schema:
```ts
JWT_ACCESS_SECRET:     z.string().min(32),
JWT_REFRESH_SECRET:    z.string().min(32),
JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
JWT_REFRESH_EXPIRES_IN:z.string().default("7d"),
```

`.env.example`:
```
JWT_ACCESS_SECRET=<node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_REFRESH_SECRET=<same command>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

---

### 3. Extend Prisma schema

`prisma/schema.prisma` — add User, RefreshToken, and `userId` on Figure:

```prisma
model User {
  id           String         @id @default(auto()) @map("_id") @db.ObjectId
  email        String         @unique
  passwordHash String
  displayName  String?
  tokenBalance Int            @default(0)
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  figures       Figure[]
  refreshTokens RefreshToken[]
  purchases     TokenPurchase[]  // referenced in Phase 04
}

model RefreshToken {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  token     String   @unique
  userId    String   @db.ObjectId
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
}

// Add to Figure:
model Figure {
  // ...existing fields...
  userId  String  @db.ObjectId
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}
```

Run: `npx prisma db push`

---

### 4. JWT utilities

File: `src/lib/jwt.ts`

```ts
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AccessPayload  { sub: string; email: string }
export interface RefreshPayload { sub: string }

export const ACCESS_TTL  = 15 * 60;
export const REFRESH_TTL = 7 * 24 * 60 * 60;

export const signAccessToken  = (p: AccessPayload)  =>
  jwt.sign(p, env.JWT_ACCESS_SECRET,  { expiresIn: env.JWT_ACCESS_EXPIRES_IN });

export const signRefreshToken = (p: RefreshPayload) =>
  jwt.sign(p, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });

export const verifyAccessToken  = (t: string) =>
  jwt.verify(t, env.JWT_ACCESS_SECRET)  as AccessPayload;

export const verifyRefreshToken = (t: string) =>
  jwt.verify(t, env.JWT_REFRESH_SECRET) as RefreshPayload;

export function cookieOptions(maxAgeSec: number): import("express").CookieOptions {
  return { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "lax", maxAge: maxAgeSec * 1000 };
}
```

---

### 5. requireAuth middleware

File: `src/middleware/requireAuth.ts`

```ts
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request { userId: string; userEmail: string }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.access_token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const p      = verifyAccessToken(token);
    req.userId   = p.sub;
    req.userEmail= p.email;
    next();
  } catch {
    res.status(401).json({ error: "Token expired or invalid" });
  }
}
```

---

### 6. Users service (internal — no router)

File: `src/modules/users/users.service.ts`

```ts
import { prisma } from "../../db/client";

export const findUserById    = (id: string)    => prisma.user.findUnique({ where: { id } });
export const findUserByEmail = (email: string) => prisma.user.findUnique({ where: { email } });

export const createUser = (data: { email: string; passwordHash: string; displayName?: string }) =>
  prisma.user.create({ data });

export const incrementBalance = (userId: string, amount: number) =>
  prisma.user.update({ where: { id: userId }, data: { tokenBalance: { increment: amount } } });

export const decrementBalance = (userId: string, amount: number) =>
  prisma.user.update({ where: { id: userId }, data: { tokenBalance: { decrement: amount } } });
```

---

### 7. Auth service

File: `src/modules/auth/auth.service.ts`

```ts
import bcrypt from "bcryptjs";
import { prisma } from "../../db/client";
import * as users from "../users/users.service";
import * as figures from "../figures/figures.service";
import {
  signAccessToken, signRefreshToken, verifyRefreshToken,
  REFRESH_TTL, ACCESS_TTL,
} from "../../lib/jwt";

interface AuthResult {
  user:         { id: string; email: string; displayName: string | null };
  accessToken:  string;
  refreshToken: string;
}

export async function register(email: string, password: string, displayName?: string): Promise<AuthResult> {
  if (await users.findUserByEmail(email)) {
    const e = new Error("Email already in use"); (e as any).status = 409; throw e;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await users.createUser({ email, passwordHash, displayName });

  // Copy template figures into the new user's library
  await figures.copyTemplateFigures(user.id);

  return issueTokens(user);
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const user  = await users.findUserByEmail(email);
  const valid = user && await bcrypt.compare(password, user.passwordHash);
  if (!valid) { const e = new Error("Invalid credentials"); (e as any).status = 401; throw e; }
  return issueTokens(user!);
}

export async function refresh(rawToken: string): Promise<AuthResult> {
  const stored = await prisma.refreshToken.findUnique({ where: { token: rawToken } });
  if (!stored || stored.expiresAt < new Date()) {
    const e = new Error("Invalid or expired refresh token"); (e as any).status = 401; throw e;
  }
  verifyRefreshToken(rawToken);
  await prisma.refreshToken.delete({ where: { id: stored.id } });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: stored.userId } });
  return issueTokens(user);
}

export async function logout(rawToken: string) {
  await prisma.refreshToken.deleteMany({ where: { token: rawToken } });
}

async function issueTokens(user: { id: string; email: string; displayName: string | null }): Promise<AuthResult> {
  const accessToken  = signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = signRefreshToken({ sub: user.id });
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + REFRESH_TTL * 1000) },
  });
  return { user: { id: user.id, email: user.email, displayName: user.displayName }, accessToken, refreshToken };
}
```

---

### 8. Auth router

File: `src/modules/auth/auth.router.ts`

```ts
import { Router } from "express";
import * as auth from "./auth.service";
import { requireAuth } from "../../middleware/requireAuth";
import { findUserById } from "../users/users.service";
import { cookieOptions, ACCESS_TTL, REFRESH_TTL } from "../../lib/jwt";

const router = Router();

const setCookies = (res: import("express").Response, a: string, r: string) => {
  res.cookie("access_token",  a, cookieOptions(ACCESS_TTL));
  res.cookie("refresh_token", r, cookieOptions(REFRESH_TTL));
};

router.post("/register", async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body;
    const result = await auth.register(email, password, displayName);
    setCookies(res, result.accessToken, result.refreshToken);
    res.status(201).json({ user: result.user });
  } catch (e) { next(e); }
});

router.post("/login", async (req, res, next) => {
  try {
    const result = await auth.login(req.body.email, req.body.password);
    setCookies(res, result.accessToken, result.refreshToken);
    res.json({ user: result.user });
  } catch (e) { next(e); }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ error: "No refresh token" });
    const result = await auth.refresh(token);
    setCookies(res, result.accessToken, result.refreshToken);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post("/logout", async (req, res, next) => {
  try {
    if (req.cookies?.refresh_token) await auth.logout(req.cookies.refresh_token);
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await findUserById(req.userId);
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json({ id: user.id, email: user.email, displayName: user.displayName, tokenBalance: user.tokenBalance });
  } catch (e) { next(e); }
});

export default router;
```

---

### 9. Scope figures to userId

Update `src/modules/figures/figures.service.ts` — every query adds `userId` to its `where` clause:

```ts
// Add userId param to all functions
export async function listFigures(userId: string) {
  return prisma.figure.findMany({
    where: { userId },
    include: { skins: { include: { variants: { include: { images: { include: { models: { include: { animations: true } } } } } } } } },
  });
}

export async function getFigureById(userId: string, id: string) {
  return prisma.figure.findFirst({ where: { id, userId }, include: { /* full hierarchy */ } });
}

export async function createFigure(userId: string, input: CreateFigureInput) {
  return prisma.figure.create({ data: { userId, ...input } });
}

export async function deleteFigure(userId: string, id: string) {
  const fig = await prisma.figure.findFirst({ where: { id, userId } });
  if (!fig) { const e = new Error("Not found"); (e as any).status = 404; throw e; }
  // Also delete all GCS assets in the cascade tree before removing DB records
  // See: deleteGcsAssetsForFigure() helper — queries all animations/models under figure
  return prisma.figure.delete({ where: { id } });
}

/** Template figures are seeded under a dedicated "seed" user — copy on new user registration */
export async function copyTemplateFigures(userId: string) {
  const templates = await prisma.figure.findMany({
    where:   { userId: "000000000000000000000000" }, // seed userId constant
    include: { skins: { include: { variants: { include: { images: { include: { models: { include: { animations: true } } } } } } } } },
  });

  for (const fig of templates) {
    const newFig = await prisma.figure.create({ data: { userId, name: fig.name, type: fig.type } });
    for (const skin of fig.skins) {
      const newSkin = await prisma.skin.create({ data: { figureId: newFig.id, name: skin.name, isBase: skin.isBase } });
      for (const variant of skin.variants) {
        const newVariant = await prisma.skinVariant.create({
          data: { skinId: newSkin.id, variant: variant.variant, prompt: variant.prompt, negativePrompt: variant.negativePrompt, imageModel: variant.imageModel },
        });
        // Copy image/model/animation records — GCS URLs are already permanent and shareable
        for (const img of variant.images) {
          const newImg = await prisma.skinImage.create({
            data: { variantId: newVariant.id, sourceUrl: img.sourceUrl, gcsUrl: img.gcsUrl, gcsBucket: img.gcsBucket, gcsKey: img.gcsKey },
          });
          for (const model of img.models) {
            const newModel = await prisma.model3D.create({
              data: { imageId: newImg.id, status: model.status, gcsPbrModelUrl: model.gcsPbrModelUrl, gcsModelUrl: model.gcsModelUrl, gcsPbrModelKey: model.gcsPbrModelKey, gcsModelKey: model.gcsModelKey },
            });
            for (const anim of model.animations) {
              await prisma.animation.create({
                data: { model3dId: newModel.id, animationKey: anim.animationKey, gcsGlbUrl: anim.gcsGlbUrl, gcsGlbKey: anim.gcsGlbKey, status: anim.status },
              });
            }
          }
        }
      }
    }
  }
}
```

---

### 10. Scope pipeline to userId

Update `pipeline.router.ts` — it now requires `requireAuth` and passes `req.userId` to the service. All DB writes inside `pipeline.service.ts` already use `figureId` which is implicitly scoped — but verify ownership before running:

```ts
// In pipeline.router.ts, before running pipeline:
const figure = await prisma.figure.findFirst({ where: { id: figureId, userId: req.userId } });
if (!figure) return res.status(404).json({ error: "Figure not found" });
```

---

### 11. Protect routes in `src/server.ts`

```ts
import cookieParser from "cookie-parser";
import authRouter from "./modules/auth/auth.router";
import { requireAuth } from "./middleware/requireAuth";

app.use(cookieParser());
app.use("/api/auth", authRouter);   // public

app.use("/api/figures",     requireAuth, figuresRouter);
app.use("/api/pipeline",    requireAuth, pipelineRouter);
// all other /api routes...
```

---

### 12. Update seed for template userId

In `prisma/seed.ts`, create a dedicated seed user and use its ID for all seeded figures:

```ts
const SEED_USER_ID = "000000000000000000000000"; // fixed ObjectId for templates
```

MongoDB ObjectIds must be valid 24-char hex. Use `000000000000000000000000` as the sentinel.

---

## Acceptance criteria

- [ ] `POST /api/auth/register` creates user, copies template figures, sets HTTP-only cookies.
- [ ] `POST /api/auth/login` authenticates; returns `401` on wrong password.
- [ ] `POST /api/auth/refresh` rotates the refresh token; old token cannot be reused.
- [ ] `GET /api/auth/me` returns `{ id, email, displayName, tokenBalance }` or `401`.
- [ ] `GET /api/figures` returns only the authenticated user's figures with full hierarchy.
- [ ] `POST /api/pipeline` with a figureId belonging to another user returns `404`.
- [ ] Passwords stored as bcrypt hashes only.
- [ ] No Prisma calls outside `*.service.ts`.
