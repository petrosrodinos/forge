import { prisma } from "../../integrations/db/client";
import { deleteGcsFiles } from "../../integrations/gcs/gcs.service";
import { collectGcsKeysFromFigures } from "../../integrations/gcs/collectGcsAssetKeys";
import { figureWithAllAssetsInclude } from "../figures/repositories/figures.repository";
import { SEED_USER_ID } from "../figures/figures.service";
import type { AdminMetricsDto, AdminUserRowDto } from "./admin.types";

export async function getAdminMetrics(): Promise<AdminMetricsDto> {
  const purchases = await prisma.tokenPurchase.findMany({
    select: { amountCents: true, stripeFeeCents: true },
  });
  const netPurchaseCents = purchases.reduce(
    (sum, p) => sum + p.amountCents - (p.stripeFeeCents ?? 0),
    0,
  );

  const usages = await prisma.tokenUsage.findMany({
    select: { price: true, priceOriginal: true },
  });
  let tokenUsagePriceTotal = 0;
  let tokenUsagePriceOriginalTotal = 0;
  for (const u of usages) {
    tokenUsagePriceTotal += u.price;
    tokenUsagePriceOriginalTotal += u.priceOriginal;
  }
  const tokenUsageMarginTotal = tokenUsagePriceTotal - tokenUsagePriceOriginalTotal;

  return {
    netPurchaseCents,
    tokenUsagePriceTotal,
    tokenUsagePriceOriginalTotal,
    tokenUsageMarginTotal,
  };
}

export async function listUsersForAdmin(): Promise<AdminUserRowDto[]> {
  const rows = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      tokenBalance: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    displayName: r.displayName,
    role: r.role,
    tokenBalance: r.tokenBalance,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function deleteUserAndAssets(actorUserId: string, targetUserId: string): Promise<void> {
  if (actorUserId === targetUserId) {
    const e = new Error("Cannot delete your own account");
    (e as Error & { status?: number }).status = 400;
    throw e;
  }
  if (targetUserId === SEED_USER_ID) {
    const e = new Error("Cannot delete the template account");
    (e as Error & { status?: number }).status = 400;
    throw e;
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) {
    const e = new Error("User not found");
    (e as Error & { status?: number }).status = 404;
    throw e;
  }

  const figures = await prisma.figure.findMany({
    where: { userId: targetUserId },
    include: figureWithAllAssetsInclude,
  });

  await deleteGcsFiles(collectGcsKeysFromFigures(figures));
  await prisma.user.delete({ where: { id: targetUserId } });
}
