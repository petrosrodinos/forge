import type { Request, Response, NextFunction } from "express";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const message = err instanceof Error ? err.message : String(err);
  console.error("[errorHandler]", message);
  res.status(500).json({ error: message });
}
