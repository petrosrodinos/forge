import type { Request, Response } from "express";
import { getAimlBalance, getTripoBalance } from "./balance.service";

export async function getAimlBalanceController(_req: Request, res: Response) {
  try {
    res.json(await getAimlBalance());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}

export async function getTripoBalanceController(_req: Request, res: Response) {
  try {
    res.json(await getTripoBalance());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}

