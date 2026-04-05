import axios from "axios";
import type { Request, Response } from "express";
import type { ModelVersion } from "../../integrations/trippo/types";
import { usageMetadataWithProviderCosts } from "../../lib/provider-costs-metadata";
import {
  createPrerigCheck,
  createRetarget,
  createRig,
  getTask,
  meshFromImageUrl,
  proxyModelByUrl,
} from "./tripo.service";
import {
  assertUserHasTokenBalance,
  debitForTrippoModelId,
  getDebitTokensForTrippoModelId,
  InsufficientTokensError,
} from "../tokens/tokens.service";

export async function proxyModelController(req: Request, res: Response) {
  try {
    const url = req.body?.url;
    if (typeof url !== "string") {
      res.status(400).json({ error: "url is required" });
      return;
    }

    const { buffer, contentType } = await proxyModelByUrl(url);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(buffer);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      res.status(404).json({ error: "Model not found" });
      return;
    }
    const status = (err as Error & { status?: number }).status ?? 502;
    res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
  }
}

export async function getTaskController(req: Request, res: Response) {
  try {
    const taskId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    res.json(await getTask(taskId));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}

export async function meshFromImageUrlController(req: Request, res: Response) {
  try {
    const imageUrl = req.body?.imageUrl;
    const modelVersion = req.body?.modelVersion as ModelVersion | undefined;
    if (!imageUrl || typeof imageUrl !== "string") {
      res.status(400).json({ error: "imageUrl is required" });
      return;
    }
    await assertUserHasTokenBalance(req.userId, getDebitTokensForTrippoModelId("image_to_model"));
    const { meshTaskId, modelVersion: mv, meshCostsMetadata } = await meshFromImageUrl(imageUrl, modelVersion);
    await debitForTrippoModelId(
      req.userId,
      "image_to_model",
      "trippoMesh",
      undefined,
      usageMetadataWithProviderCosts(meshCostsMetadata, "trippo"),
    );
    res.json({ meshTaskId, modelVersion: mv });
  } catch (err) {
    if (err instanceof InsufficientTokensError) {
      res.status(402).json({ error: err.message, required: err.required, balance: err.balance });
      return;
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}

export async function prerigCheckController(req: Request, res: Response) {
  try {
    const meshTaskId = req.body?.meshTaskId;
    if (!meshTaskId || typeof meshTaskId !== "string") {
      res.status(400).json({ error: "meshTaskId is required" });
      return;
    }
    const { prerigTaskId } = await createPrerigCheck(meshTaskId);
    res.json({ prerigTaskId });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}

export async function startRigController(req: Request, res: Response) {
  try {
    const meshTaskId = req.body?.meshTaskId;
    if (!meshTaskId || typeof meshTaskId !== "string") {
      res.status(400).json({ error: "meshTaskId is required" });
      return;
    }
    await assertUserHasTokenBalance(req.userId, getDebitTokensForTrippoModelId("animate_rig"));
    const { rigTaskId, costsMetadata } = await createRig(meshTaskId);
    await debitForTrippoModelId(
      req.userId,
      "animate_rig",
      "rig",
      undefined,
      usageMetadataWithProviderCosts(costsMetadata, "trippo"),
    );
    res.json({ rigTaskId });
  } catch (err) {
    if (err instanceof InsufficientTokensError) {
      res.status(402).json({ error: err.message, required: err.required, balance: err.balance });
      return;
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}

export async function startRetargetController(req: Request, res: Response) {
  try {
    const rigTaskId = req.body?.rigTaskId;
    const animation = req.body?.animation;
    if (!rigTaskId || typeof rigTaskId !== "string") {
      res.status(400).json({ error: "rigTaskId is required" });
      return;
    }
    if (!animation || typeof animation !== "string") {
      res.status(400).json({ error: "animation is required" });
      return;
    }
    await assertUserHasTokenBalance(req.userId, getDebitTokensForTrippoModelId("animate_retarget"));
    const { retargetTaskId, costsMetadata } = await createRetarget(rigTaskId, animation);
    await debitForTrippoModelId(
      req.userId,
      "animate_retarget",
      "animationRetarget",
      undefined,
      usageMetadataWithProviderCosts(costsMetadata, "trippo"),
    );
    res.json({ retargetTaskId });
  } catch (err) {
    if (err instanceof InsufficientTokensError) {
      res.status(402).json({ error: err.message, required: err.required, balance: err.balance });
      return;
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}

