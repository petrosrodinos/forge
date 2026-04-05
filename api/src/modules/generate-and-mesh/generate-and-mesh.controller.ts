import type { Request, Response } from "express";
import { usageMetadataWithProviderCosts } from "../../lib/provider-costs-metadata";
import { generateAndMesh } from "./generate-and-mesh.service";
import { PIPELINE_CONFIG } from "../pipeline/config/pipeline.config";
import { IMAGES_CONFIG } from "../images/config/images.config";
import {
  assertUserHasTokenBalance,
  debitImageThenTrippoMesh,
  getDebitTokensForImageModel,
  getDebitTokensForTrippoModelId,
  InsufficientTokensError,
} from "../tokens/tokens.service";

export async function generateAndMeshController(req: Request, res: Response) {
  try {
    const {
      prompt,
      model,
      size,
      steps,
      n = 1,
      modelVersion,
      meshModelVersion,
      timeoutMs = PIPELINE_CONFIG.DEFAULT_POLL_TIMEOUT_MS,
      idempotencyKey,
    } = req.body as Record<string, unknown>;

    if (typeof prompt !== "string" || !prompt.trim()) {
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    const imageModelId = typeof model === "string" ? model : IMAGES_CONFIG.DEFAULT_AIML_IMAGE_MODEL;
    let imageDebit: number;
    try {
      imageDebit = getDebitTokensForImageModel(imageModelId);
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      if (status === 400) {
        res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
        return;
      }
      throw err;
    }
    const meshDebit = getDebitTokensForTrippoModelId("image_to_model");
    try {
      await assertUserHasTokenBalance(req.userId, imageDebit + meshDebit);
    } catch (err) {
      if (err instanceof InsufficientTokensError) {
        res.status(402).json({ error: err.message, required: err.required, balance: err.balance });
        return;
      }
      throw err;
    }

    const rawResult = await generateAndMesh({
      prompt,
      model: typeof model === "string" ? model : undefined,
      size: typeof size === "string" ? size : undefined,
      steps: typeof steps === "number" ? steps : undefined,
      n: typeof n === "number" ? n : undefined,
      modelVersion: typeof modelVersion === "string" ? modelVersion : undefined,
      meshModelVersion: typeof meshModelVersion === "string" ? meshModelVersion : undefined,
      timeoutMs: typeof timeoutMs === "number" ? timeoutMs : undefined,
    });

    const { aimlCostsMetadata, trippoCostsMetadata, ...result } = rawResult;

    try {
      await debitImageThenTrippoMesh(
        req.userId,
        imageModelId,
        typeof idempotencyKey === "string" ? idempotencyKey : undefined,
        {
          image: usageMetadataWithProviderCosts(aimlCostsMetadata, "aimlapi"),
          trippo: usageMetadataWithProviderCosts(trippoCostsMetadata, "trippo"),
        },
      );
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
      throw err;
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}

