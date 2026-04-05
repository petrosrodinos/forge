import type { Request, Response } from "express";
import { usageMetadataWithProviderCosts } from "../../lib/provider-costs-metadata";
import { generateImage, listImageModels } from "./images.service";
import { IMAGES_CONFIG } from "./config/images.config";
import {
  assertUserHasTokenBalance,
  debitForImageModel,
  getDebitTokensForImageModel,
  InsufficientTokensError,
} from "../tokens/tokens.service";

export async function listImageModelsController(_req: Request, res: Response) {
  try {
    res.json(await listImageModels());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}

export async function generateImageController(req: Request, res: Response) {
  const { prompt, model, size, n, steps } = req.body as Record<string, unknown>;
  if (typeof prompt !== "string" || !prompt.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  const modelId = typeof model === "string" ? model : IMAGES_CONFIG.DEFAULT_AIML_IMAGE_MODEL;

  try {
    await assertUserHasTokenBalance(req.userId, getDebitTokensForImageModel(modelId));
  } catch (err) {
    if (err instanceof InsufficientTokensError) {
      res.status(402).json({ error: err.message, required: err.required, balance: err.balance });
      return;
    }
    const status = (err as Error & { status?: number }).status;
    if (status === 400) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
      return;
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    return;
  }

  try {
    const { data, costsMetadata } = await generateImage({
      prompt,
      model: typeof model === "string" ? model : undefined,
      size: typeof size === "string" ? size : undefined,
      n: typeof n === "number" ? n : undefined,
      steps: typeof steps === "number" ? steps : undefined,
    });
    try {
      await debitForImageModel(
        req.userId,
        modelId,
        undefined,
        usageMetadataWithProviderCosts(costsMetadata, "aimlapi"),
      );
    } catch (err) {
      if (err instanceof InsufficientTokensError) {
        res.status(402).json({ error: err.message, required: err.required, balance: err.balance });
        return;
      }
      const st = (err as Error & { status?: number }).status;
      if (st === 400) {
        res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
        return;
      }
      throw err;
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}

