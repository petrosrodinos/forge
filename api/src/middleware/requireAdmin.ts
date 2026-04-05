import type { Request, Response, NextFunction } from "express";

/** Must run after `requireAuth` so `req.userRole` is set. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.userRole !== "ADMIN") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
