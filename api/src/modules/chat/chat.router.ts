import type { Request, Response, NextFunction } from "express";
import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { requireTokens } from "../../middleware/requireTokens";
import { chatController } from "./chat.controller";

const router = Router();

function requireChatBody(req: Request, res: Response, next: NextFunction) {
  const body = req.body as { message?: unknown };
  if (typeof body.message !== "string" || !body.message.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }
  next();
}

router.post("/", requireAuth, requireChatBody, requireTokens("chat"), chatController);

export default router;

