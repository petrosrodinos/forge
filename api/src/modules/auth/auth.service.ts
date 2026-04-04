import bcrypt from "bcryptjs";
import * as users from "../users/users.service";
import { copyTemplateFigures } from "../figures/figures.service";
import {
  signAccessToken, signRefreshToken, verifyRefreshToken,
  REFRESH_TTL,
} from "../../lib/jwt";
import type { AuthResult } from "./auth.types";
import { prisma } from "../../integrations/db/client";

export async function register(email: string, password: string, displayName?: string): Promise<AuthResult> {
  if (await users.findUserByEmail(email)) {
    const e = new Error("Email already in use"); (e as any).status = 409; throw e;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await users.createUser({ email, passwordHash, displayName });

  await copyTemplateFigures(user.id);

  return issueTokens(user);
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await users.findUserByEmail(email);
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

async function issueTokens(user: { id: string; email: string; displayName: string | null; role: string }): Promise<AuthResult> {
  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id });
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + REFRESH_TTL * 1000) },
  });
  return { user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role }, accessToken, refreshToken };
}
