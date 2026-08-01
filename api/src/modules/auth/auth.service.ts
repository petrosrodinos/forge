import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import * as users from "../users/users.service";
import {
  signAccessToken, signRefreshToken, verifyRefreshToken,
  REFRESH_TTL,
} from "../../lib/jwt";
import type { AuthResult } from "./auth.types";
import { prisma } from "../../integrations/db/client";
import { resend } from "../../integrations/resend/resend.client";
import { renderEmailTemplate } from "../../integrations/resend/renderTemplate";
import { env } from "../../config/env/env-validation";
import { AUTH_CONFIG } from "./config/auth.config";

function hashResetToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function appUrlLabel(appUrl: string): string {
  try {
    return new URL(appUrl).host;
  } catch {
    return appUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

export async function register(email: string, password: string, displayName?: string): Promise<AuthResult> {
  if (await users.findUserByEmail(email)) {
    const e = new Error("Email already in use"); (e as any).status = 409; throw e;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await users.createUser({ email, passwordHash, displayName });

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

export async function forgotPassword(email: string): Promise<{ ok: true }> {
  if (!resend) {
    const e = new Error("Email service is not configured");
    (e as any).status = 503;
    throw e;
  }

  const user = await users.findUserByEmail(email.trim());
  if (!user) return { ok: true };

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + AUTH_CONFIG.PASSWORD_RESET_TTL_MS);

  await prisma.passwordResetToken.create({
    data: { tokenHash, userId: user.id, expiresAt },
  });

  const appUrl = env.APP_URL.replace(/\/$/, "");
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const subject = "Reset your Forge password";
  const html = renderEmailTemplate("password-reset", {
    appName: "Forge",
    appUrl,
    appUrlLabel: appUrlLabel(appUrl),
    displayName: user.displayName?.trim() || null,
    resetUrl,
    expiresIn: "1 hour",
    year: new Date().getFullYear(),
    subject,
    preheader: "Use this secure link to choose a new Forge password. It expires in 1 hour.",
  });

  const { error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: [user.email],
    subject,
    html,
  });

  if (error) {
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    const e = new Error(error.message || "Failed to send reset email");
    (e as any).status = 502;
    throw e;
  }

  return { ok: true };
}

export async function resetPassword(token: string, password: string): Promise<{ ok: true }> {
  const tokenHash = hashResetToken(token);
  const stored = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.expiresAt < new Date()) {
    const e = new Error("Invalid or expired reset token");
    (e as any).status = 400;
    throw e;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: stored.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: stored.userId } }),
    prisma.refreshToken.deleteMany({ where: { userId: stored.userId } }),
  ]);

  return { ok: true };
}

export async function updateProfile(
  userId: string,
  data: {
    email?: string;
    displayName?: string | null;
    currentPassword?: string;
  },
): Promise<{ id: string; email: string; displayName: string | null; role: string; tokenBalance: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const e = new Error("Not found");
    (e as any).status = 404;
    throw e;
  }

  const nextEmail = data.email?.trim();
  const emailChanging = nextEmail !== undefined && nextEmail !== user.email;

  if (emailChanging) {
    if (!data.currentPassword) {
      const e = new Error("Current password is required to change email");
      (e as any).status = 400;
      throw e;
    }
    const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!valid) {
      const e = new Error("Invalid current password");
      (e as any).status = 401;
      throw e;
    }
    const existing = await users.findUserByEmail(nextEmail!);
    if (existing && existing.id !== userId) {
      const e = new Error("Email already in use");
      (e as any).status = 409;
      throw e;
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(emailChanging ? { email: nextEmail } : {}),
      ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    displayName: updated.displayName,
    role: updated.role,
    tokenBalance: updated.tokenBalance,
  };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const e = new Error("Not found");
    (e as any).status = 404;
    throw e;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    const e = new Error("Invalid current password");
    (e as any).status = 401;
    throw e;
  }

  if (currentPassword === newPassword) {
    const e = new Error("New password must be different");
    (e as any).status = 400;
    throw e;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.refreshToken.deleteMany({ where: { userId } }),
  ]);

  return { ok: true };
}

async function issueTokens(user: { id: string; email: string; displayName: string | null; role: string }): Promise<AuthResult> {
  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id });
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + REFRESH_TTL * 1000) },
  });
  return { user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role }, accessToken, refreshToken };
}
