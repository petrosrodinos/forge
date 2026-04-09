import { stripe } from "../../integrations/stripe/stripe.client";
import { prisma } from "../../integrations/db/client";
import { env } from "../../config/env/env-validation";
import { getPackById, resolveStripePriceIdForPack, TOKEN_PACKS } from "../../config/models/tokenPacks";
import type { PurchaseRecord, UsageHistoryPage, UsageRecord } from "./billing.types";

function httpError(status: number, message: string): Error {
  const e = new Error(message);
  (e as Error & { status: number }).status = status;
  return e;
}

export async function createCheckoutSession(userId: string, packId: string) {
  const pack = getPackById(packId);
  if (!pack) throw httpError(400, "Invalid pack");
  const stripePriceId = await resolveStripePriceIdForPack(pack.id);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: stripePriceId, quantity: 1 }],
    success_url: `${env.APP_URL}/settings/billing?success=1`,
    cancel_url: `${env.APP_URL}/settings/billing?cancelled=1`,
    metadata: {
      userId,
      packId: pack.id,
      tokens: String(pack.tokens),
    },
  });

  if (!session.url) throw httpError(500, "Stripe did not return a checkout URL");
  return { url: session.url };
}

export async function getBalance(userId: string): Promise<{ balance: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenBalance: true },
  });
  return { balance: user?.tokenBalance ?? 0 };
}

export async function getPurchaseHistory(userId: string): Promise<PurchaseRecord[]> {
  const rows = await prisma.tokenPurchase.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((r) => ({
    id: r.id,
    packId: r.packId,
    tokens: r.tokens,
    amountCents: r.amountCents,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getUsageHistory(
  userId: string,
  limit: number,
  offset: number,
): Promise<UsageHistoryPage> {
  const take = Math.min(Math.max(limit, 1), 100);
  const skip = Math.max(offset, 0);
  const where = { userId };

  const [rows, total] = await prisma.$transaction([
    prisma.tokenUsage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.tokenUsage.count({ where }),
  ]);

  const items: UsageRecord[] = rows.map((r) => ({
    id: r.id,
    usageKind: r.usageKind,
    modelId: r.modelId,
    operation: r.operation ?? null,
    tokens: r.tokens,
    createdAt: r.createdAt.toISOString(),
    metadata: r.metadata ?? null,
  }));

  return { items, total, limit: take, offset: skip };
}

export function getTokenPacks() {
  return TOKEN_PACKS.map(({ id, name, tokens, price }) => ({ id, name, tokens, price }));
}

export async function creditTokensFromWebhook(
  userId: string,
  packId: string,
  tokens: number,
  amountCents: number,
  stripeSessionId: string,
  stripeFeeCents: number | null,
) {
  const existing = await prisma.tokenPurchase.findUnique({ where: { stripeSessionId } });
  if (existing) return;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { tokenBalance: { increment: tokens } },
    }),
    prisma.tokenPurchase.create({
      data: { userId, packId, tokens, amountCents, stripeSessionId, stripeFeeCents },
    }),
  ]);
}

/** Backfill or refresh Stripe fee from BalanceTransaction (e.g. after `charge.updated`). */
export async function updatePurchaseStripeFeeBySession(
  stripeSessionId: string,
  stripeFeeCents: number,
): Promise<void> {
  await prisma.tokenPurchase.updateMany({
    where: { stripeSessionId },
    data: { stripeFeeCents },
  });
}
