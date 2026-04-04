import jwt from "jsonwebtoken";
import { env } from "../config/env/env-validation";

export interface AccessPayload { sub: string; email: string; role: string }
export interface RefreshPayload { sub: string }

export const ACCESS_TTL = 15 * 60;
export const REFRESH_TTL = 7 * 24 * 60 * 60;

export const signAccessToken = (p: AccessPayload) =>
  jwt.sign(p, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"] });

export const signRefreshToken = (p: RefreshPayload) =>
  jwt.sign(p, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"] });

export const verifyAccessToken = (t: string) =>
  jwt.verify(t, env.JWT_ACCESS_SECRET) as AccessPayload;

export const verifyRefreshToken = (t: string) =>
  jwt.verify(t, env.JWT_REFRESH_SECRET) as RefreshPayload;

export function cookieOptions(maxAgeSec: number): import("express").CookieOptions {
  return { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "lax", maxAge: maxAgeSec * 1000 };
}
