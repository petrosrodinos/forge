import { Router } from "express";
import * as auth from "./auth.service";
import { requireAuth } from "../../middleware/requireAuth";
import { findUserById } from "../users/users.service";
import { cookieOptions, ACCESS_TTL, REFRESH_TTL } from "../../lib/jwt";
import {
  changePasswordBodySchema,
  forgotPasswordBodySchema,
  resetPasswordBodySchema,
  updateMeBodySchema,
} from "./auth.schemas";

const router = Router();

const setCookies = (res: import("express").Response, a: string, r: string) => {
  res.cookie("access_token",  a, cookieOptions(ACCESS_TTL));
  res.cookie("refresh_token", r, cookieOptions(REFRESH_TTL));
};

router.post("/register", async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email and password are required" });
    const result = await auth.register(email, password, displayName);
    setCookies(res, result.accessToken, result.refreshToken);
    res.status(201).json({ user: result.user });
  } catch (e) { next(e); }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email and password are required" });
    const result = await auth.login(email, password);
    setCookies(res, result.accessToken, result.refreshToken);
    res.json({ user: result.user });
  } catch (e) { next(e); }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const parsed = forgotPasswordBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const result = await auth.forgotPassword(parsed.data.email);
    res.json(result);
  } catch (e) { next(e); }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const parsed = resetPasswordBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const result = await auth.resetPassword(parsed.data.token, parsed.data.password);
    res.json(result);
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
    res.json({ id: user.id, email: user.email, displayName: user.displayName, role: user.role, tokenBalance: user.tokenBalance });
  } catch (e) { next(e); }
});

router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const parsed = updateMeBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    }
    const user = await auth.updateProfile(req.userId, parsed.data);
    res.json(user);
  } catch (e) {
    next(e);
  }
});

router.post("/password", requireAuth, async (req, res, next) => {
  try {
    const parsed = changePasswordBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    }
    await auth.changePassword(req.userId, parsed.data.currentPassword, parsed.data.newPassword);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
