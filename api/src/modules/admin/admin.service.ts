import { prisma } from "../../integrations/db/client";
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
  const tokenUsageMarginTotal = usages.reduce((sum, u) => sum + (u.price - u.priceOriginal), 0);

  return { netPurchaseCents, tokenUsageMarginTotal };
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
