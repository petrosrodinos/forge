import { prisma } from "../../integrations/db/client";
import { getPackById } from "../../config/models/tokenPacks";
import { deleteGcsFiles } from "../../integrations/gcs/gcs.service";
import { collectGcsKeysFromFigures } from "../../integrations/gcs/collectGcsAssetKeys";
import { figureWithAllAssetsInclude } from "../figures/repositories/figures.repository";
import type { AdminMetricsDto, AdminUserPurchaseDto, AdminUserRowDto, AdminUserUpdateInput } from "./admin.types";

export async function getAdminMetrics(): Promise<AdminMetricsDto> {
  const [purchases, usages, generatedImagesCount, generatedMeshesCount, generatedRigsCount, generatedAnimationsCount] =
    await Promise.all([
      prisma.tokenPurchase.findMany({
        select: { amountCents: true, stripeFeeCents: true },
      }),
      prisma.tokenUsage.findMany({
        select: { price: true, priceOriginal: true },
      }),
      prisma.skinImage.count(),
      prisma.model3D.count(),
      prisma.model3D.count({ where: { rigTaskId: { not: null } } }),
      prisma.animation.count(),
    ]);

  const totalStripeFeeCents = purchases.reduce((sum, p) => sum + (p.stripeFeeCents ?? 0), 0);
  const netPurchaseCents = purchases.reduce(
    (sum, p) => sum + p.amountCents - (p.stripeFeeCents ?? 0),
    0,
  );
  let tokenUsagePriceTotal = 0;
  let tokenUsagePriceOriginalTotal = 0;
  for (const u of usages) {
    tokenUsagePriceTotal += u.price;
    tokenUsagePriceOriginalTotal += u.priceOriginal;
  }
  const tokenUsageMarginTotal = tokenUsagePriceTotal - tokenUsagePriceOriginalTotal;

  return {
    netPurchaseCents,
    totalStripeFeeCents,
    tokenUsagePriceTotal,
    tokenUsagePriceOriginalTotal,
    tokenUsageMarginTotal,
    generatedImagesCount,
    generatedMeshesCount,
    generatedRigsCount,
    generatedAnimationsCount,
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

export async function listPurchasesForAdmin(targetUserId?: string): Promise<AdminUserPurchaseDto[]> {
  if (targetUserId) {
    const user = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
    if (!user) {
      const e = new Error("User not found");
      (e as Error & { status?: number }).status = 404;
      throw e;
    }
  }

  const rows = await prisma.tokenPurchase.findMany({
    where: targetUserId ? { userId: targetUserId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  return rows.map((r) => {
    const pack = getPackById(r.packId);
    return {
      userId: r.user.id,
      userEmail: r.user.email,
      id: r.id,
      packId: r.packId,
      packName: pack?.name ?? r.packId,
      tokens: r.tokens,
      amountCents: r.amountCents,
      stripeFeeCents: r.stripeFeeCents ?? null,
      stripeSessionId: r.stripeSessionId,
      createdAt: r.createdAt.toISOString(),
    };
  });
}

export async function deleteUserAndAssets(actorUserId: string, targetUserId: string): Promise<void> {
  if (actorUserId === targetUserId) {
    const e = new Error("Cannot delete your own account");
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

export async function updateUserByAdmin(
  actorUserId: string,
  targetUserId: string,
  input: AdminUserUpdateInput,
): Promise<AdminUserRowDto> {
  const actor = await prisma.user.findUnique({ where: { id: actorUserId }, select: { id: true, role: true } });
  if (!actor || actor.role !== "ADMIN") {
    const e = new Error("Forbidden");
    (e as Error & { status?: number }).status = 403;
    throw e;
  }

  if (actorUserId === targetUserId && input.role !== "ADMIN") {
    const e = new Error("Cannot remove your own admin role");
    (e as Error & { status?: number }).status = 400;
    throw e;
  }

  try {
    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        email: input.email,
        displayName: input.displayName,
        role: input.role,
        tokenBalance: input.tokenBalance,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        tokenBalance: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      displayName: updated.displayName,
      role: updated.role,
      tokenBalance: updated.tokenBalance,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  } catch (err) {
    if (typeof err === "object" && err !== null && "code" in err) {
      const code = String((err as { code?: unknown }).code ?? "");
      if (code === "P2025") {
        const e = new Error("User not found");
        (e as Error & { status?: number }).status = 404;
        throw e;
      }
      if (code === "P2002") {
        const e = new Error("Email is already in use");
        (e as Error & { status?: number }).status = 409;
        throw e;
      }
    }
    throw err;
  }
}
