import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client";
import { TokenUsageKind } from "../../generated/prisma/enums";
import { prisma } from "../../integrations/db/client";
import { canonicalImageModelId, ImageModels } from "../../config/models/image-models";
import { TrippoModels } from "../../config/models/trippo-models";
import {
  CHAT_PRICE_ORIGINAL_USD,
  CHAT_TOKENS_ORIGINAL,
  MARKUP_FACTOR,
  TOKENS_PER_EUR,
} from "../../config/models/pricing";
import {
  getTokenOperationDebit,
  getTrippoRowOrThrow,
  type TokenOperation,
  trippoWalletDebitFromRow,
} from "../../config/models/token-operations";
import { env } from "../../config/env/env-validation";

const TX_RETRY_ATTEMPTS = 3;
const TX_RETRY_BASE_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * MongoDB Atlas / network can drop connections mid-transaction (e.g. WinError 10054).
 * Retrying is safe: an aborted txn rolls back; idempotency keys prevent double rows after success.
 */
function isTransientDbError(err: unknown): boolean {
  const parts: string[] = [];
  if (err instanceof Error) {
    parts.push(err.message);
    if ("cause" in err && err.cause != null) parts.push(String(err.cause));
  } else {
    parts.push(String(err));
  }
  const s = parts.join(" ").toLowerCase();
  return (
    s.includes("transienttransactionerror") ||
    s.includes("forcibly closed") ||
    s.includes("10054") ||
    s.includes("econnreset") ||
    s.includes("etimedout") ||
    s.includes("mongonetworkerror") ||
    s.includes("socket") ||
    s.includes("connection closed") ||
    s.includes("p2024") ||
    s.includes("p2034")
  );
}

async function runTransactionWithRetry<T>(
  run: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  let last: unknown;
  for (let i = 0; i < TX_RETRY_ATTEMPTS; i++) {
    try {
      return await prisma.$transaction(run);
    } catch (e) {
      last = e;
      if (i < TX_RETRY_ATTEMPTS - 1 && isTransientDbError(e)) {
        await sleep(TX_RETRY_BASE_MS * 2 ** i);
        continue;
      }
      throw e;
    }
  }
  throw last;
}

function mergeJsonMetadata(
  prev: Prisma.JsonValue | null | undefined,
  patch: Prisma.InputJsonValue,
): Prisma.InputJsonValue {
  if (
    prev != null &&
    typeof prev === "object" &&
    !Array.isArray(prev) &&
    patch != null &&
    typeof patch === "object" &&
    !Array.isArray(patch)
  ) {
    const p = prev as Record<string, unknown>;
    const q = patch as Record<string, unknown>;
    const out: Record<string, unknown> = { ...p };
    for (const [k, v] of Object.entries(q)) {
      const existing = out[k];
      if (
        existing != null &&
        typeof existing === "object" &&
        !Array.isArray(existing) &&
        v != null &&
        typeof v === "object" &&
        !Array.isArray(v)
      ) {
        out[k] = mergeJsonMetadata(existing as Prisma.JsonValue, v as Prisma.InputJsonValue);
      } else {
        out[k] = v;
      }
    }
    return out as Prisma.InputJsonValue;
  }
  return patch;
}

/** Merge extra fields into an existing usage row (e.g. provider response after debit). */
export async function mergeTokenUsageMetadataByIdempotencyKey(
  idempotencyKey: string,
  patch: Prisma.InputJsonValue,
): Promise<void> {
  const key = idempotencyKey.trim();
  if (!key) return;
  await runTransactionWithRetry(async (tx) => {
    const row = await tx.tokenUsage.findUnique({ where: { idempotencyKey: key }, select: { metadata: true } });
    if (!row) return;
    await tx.tokenUsage.update({
      where: { idempotencyKey: key },
      data: { metadata: mergeJsonMetadata(row.metadata, patch) },
    });
  });
}

export class InsufficientTokensError extends Error {
  readonly statusCode = 402;
  readonly required: number;
  readonly balance: number;

  constructor(required: number, balance: number) {
    super("Insufficient tokens");
    this.name = "InsufficientTokensError";
    this.required = required;
    this.balance = balance;
  }
}

export async function assertUserHasTokenBalance(userId: string, cost: number): Promise<void> {
  if (cost <= 0) return;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { tokenBalance: true } });
  const bal = user?.tokenBalance ?? 0;
  if (bal < cost) throw new InsufficientTokensError(cost, bal);
}

function trippoNumericPriceOriginal(m: (typeof TrippoModels)[number]): number {
  const p = m.price_original;
  return typeof p === "number" ? p : parseFloat(String(p));
}

async function debitWithUsageTx(
  tx: Prisma.TransactionClient,
  args: {
    userId: string;
    cost: number;
    usageKind: (typeof TokenUsageKind)[keyof typeof TokenUsageKind];
    modelId: string;
    operation?: string | null;
    tokensOriginal: number;
    priceOriginal: number;
    price: number;
    markupFactor: number;
    idempotencyKey?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  },
): Promise<void> {
  const {
    userId,
    cost,
    usageKind,
    modelId,
    operation,
    tokensOriginal,
    priceOriginal,
    price,
    markupFactor,
    idempotencyKey,
    metadata,
  } = args;

  if (cost <= 0) return;

  const persistKey = idempotencyKey?.trim() ? idempotencyKey.trim() : `auto:${randomUUID()}`;

  if (idempotencyKey?.trim()) {
    const existing = await tx.tokenUsage.findUnique({ where: { idempotencyKey: persistKey } });
    if (existing) return;
  }

  const updated = await tx.user.updateMany({
    where: { id: userId, tokenBalance: { gte: cost } },
    data: { tokenBalance: { decrement: cost } },
  });

  if (updated.count === 0) {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { tokenBalance: true } });
    throw new InsufficientTokensError(cost, user?.tokenBalance ?? 0);
  }

  const userAfter = await tx.user.findUnique({ where: { id: userId }, select: { tokenBalance: true } });

  await tx.tokenUsage.create({
    data: {
      userId,
      usageKind,
      modelId,
      operation: operation ?? undefined,
      tokensOriginal,
      priceOriginal,
      tokens: cost,
      price,
      markupFactor,
      balanceAfter: userAfter?.tokenBalance ?? undefined,
      idempotencyKey: persistKey,
      metadata: metadata ?? undefined,
    },
  });
}

export function getDebitTokensForImageModel(modelId: string): number {
  const id = canonicalImageModelId(modelId);
  const m = ImageModels.find((x) => x.id === id);
  if (!m) {
    const err = new Error(`Unknown image model: ${modelId}`);
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  return Math.ceil(m.tokens);
}

export function getDebitTokensForTrippoModelId(trippoModelId: string): number {
  const m = TrippoModels.find((x) => x.id === trippoModelId);
  if (!m) {
    const err = new Error(`Unknown Tripo model: ${trippoModelId}`);
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  return trippoWalletDebitFromRow(m);
}

export async function debitForOperation(
  userId: string,
  operation: TokenOperation,
  idempotencyKey?: string | null,
  metadata?: Prisma.InputJsonValue | null,
) {
  const cost = getTokenOperationDebit(operation);
  if (cost <= 0) return;

  let usageKind: (typeof TokenUsageKind)[keyof typeof TokenUsageKind] = TokenUsageKind.trippo;
  let modelId = "trippo";
  let tokensOriginal = cost;
  let priceOriginal = cost / TOKENS_PER_EUR;
  let price = cost / TOKENS_PER_EUR;

  if (operation === "chat") {
    usageKind = TokenUsageKind.chat;
    modelId = env.AGENT_MODEL;
    tokensOriginal = CHAT_TOKENS_ORIGINAL;
    priceOriginal = CHAT_PRICE_ORIGINAL_USD;
    price = CHAT_PRICE_ORIGINAL_USD * MARKUP_FACTOR;
  }

  if (operation === "animationRetarget") {
    const m = getTrippoRowOrThrow("animate_retarget");
    modelId = m.id;
    tokensOriginal = m.tokens_original;
    priceOriginal = trippoNumericPriceOriginal(m);
    price = Number(m.price);
  }

  if (operation === "trippoMesh") {
    const m = getTrippoRowOrThrow("image_to_model");
    modelId = m.id;
    tokensOriginal = m.tokens_original;
    priceOriginal = trippoNumericPriceOriginal(m);
    price = Number(m.price);
  }

  if (operation === "rig") {
    const m = getTrippoRowOrThrow("animate_rig");
    modelId = m.id;
    tokensOriginal = m.tokens_original;
    priceOriginal = trippoNumericPriceOriginal(m);
    price = Number(m.price);
  }

  await runTransactionWithRetry((tx) =>
    debitWithUsageTx(tx, {
      userId,
      cost,
      usageKind,
      modelId,
      operation,
      tokensOriginal,
      priceOriginal,
      price,
      markupFactor: MARKUP_FACTOR,
      idempotencyKey,
      metadata: metadata ?? undefined,
    }),
  );
}

export async function debitForImageModel(
  userId: string,
  modelId: string,
  idempotencyKey?: string | null,
  metadata?: Prisma.InputJsonValue | null,
) {
  const id = canonicalImageModelId(modelId);
  const m = ImageModels.find((x) => x.id === id);
  if (!m) {
    const err = new Error(`Unknown image model: ${modelId}`);
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const cost = Math.ceil(m.tokens);

  await runTransactionWithRetry((tx) =>
    debitWithUsageTx(tx, {
      userId,
      cost,
      usageKind: TokenUsageKind.image,
      modelId: m.id,
      operation: "image",
      tokensOriginal: m.tokens_original,
      priceOriginal: m.price_original,
      price: m.price,
      markupFactor: MARKUP_FACTOR,
      idempotencyKey,
      metadata: metadata ?? undefined,
    }),
  );
}

export async function debitForTrippoModelId(
  userId: string,
  trippoModelId: string,
  operation: string,
  idempotencyKey?: string | null,
  metadata?: Prisma.InputJsonValue | null,
) {
  const m = TrippoModels.find((x) => x.id === trippoModelId);
  if (!m) {
    const err = new Error(`Unknown Tripo model: ${trippoModelId}`);
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const cost = trippoWalletDebitFromRow(m);
  if (cost <= 0) return;

  await runTransactionWithRetry((tx) =>
    debitWithUsageTx(tx, {
      userId,
      cost,
      usageKind: TokenUsageKind.trippo,
      modelId: m.id,
      operation,
      tokensOriginal: m.tokens_original,
      priceOriginal: trippoNumericPriceOriginal(m),
      price: m.price,
      markupFactor: MARKUP_FACTOR,
      idempotencyKey,
      metadata: metadata ?? undefined,
    }),
  );
}

export async function debitImageThenTrippoMesh(
  userId: string,
  imageModelId: string,
  idempotencyKey?: string | null,
  metadata?: { image?: Prisma.InputJsonValue | null; trippo?: Prisma.InputJsonValue | null },
) {
  const resolvedImageModelId = canonicalImageModelId(imageModelId);
  const img = ImageModels.find((x) => x.id === resolvedImageModelId);
  if (!img) {
    const err = new Error(`Unknown image model: ${imageModelId}`);
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const mesh = TrippoModels.find((x) => x.id === "image_to_model");
  if (!mesh) throw new Error("Tripo image_to_model config missing");

  const imageCost = Math.ceil(img.tokens);
  const meshCost = Math.ceil(mesh.tokens);
  const kImg = idempotencyKey ? `${idempotencyKey}:image` : null;
  const kMesh = idempotencyKey ? `${idempotencyKey}:trippo` : null;

  await runTransactionWithRetry(async (tx) => {
    if (kImg && kMesh) {
      const [e1, e2] = await Promise.all([
        tx.tokenUsage.findUnique({ where: { idempotencyKey: kImg } }),
        tx.tokenUsage.findUnique({ where: { idempotencyKey: kMesh } }),
      ]);
      if (e1 && e2) return;
    }

    await debitWithUsageTx(tx, {
      userId,
      cost: imageCost,
      usageKind: TokenUsageKind.image,
      modelId: img.id,
      operation: "image",
      tokensOriginal: img.tokens_original,
      priceOriginal: img.price_original,
      price: img.price,
      markupFactor: MARKUP_FACTOR,
      idempotencyKey: kImg,
      metadata: metadata?.image ?? undefined,
    });

    await debitWithUsageTx(tx, {
      userId,
      cost: meshCost,
      usageKind: TokenUsageKind.trippo,
      modelId: mesh.id,
      operation: "trippoMesh",
      tokensOriginal: mesh.tokens_original,
      priceOriginal: trippoNumericPriceOriginal(mesh),
      price: mesh.price,
      markupFactor: MARKUP_FACTOR,
      idempotencyKey: kMesh,
      metadata: metadata?.trippo ?? undefined,
    });
  });
}
