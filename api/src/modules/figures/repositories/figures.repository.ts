import { prisma } from "../../../integrations/db/client";
import type { CreateFigureInput, UpdateFigureInput } from "../interfaces/figures.types";
import { isObjectIdLike } from "../helpers/objectIdLike.helper";

/** Nested skins → variants → images → models → animations (for GCS key collection and full figure payloads). */
export const figureWithAllAssetsInclude = {
  skins: {
    include: {
      variants: {
        include: {
          images: {
            include: {
              models: {
                include: { animations: true },
              },
            },
          },
        },
      },
    },
  },
} as const;

export async function listFigures(userId: string) {
  return prisma.figure.findMany({
    where: { userId },
    include: {
      skins: {
        include: {
          variants: {
            include: {
              images: {
                orderBy: { createdAt: "desc" },
                include: {
                  models: {
                    include: { animations: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { isBase: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getFigureById(userId: string, id: string) {
  if (isObjectIdLike(id)) {
    return prisma.figure.findFirst({
      where: { id, userId },
      include: figureWithAllAssetsInclude,
    });
  }

  return prisma.figure.findFirst({
    where: { name: id, userId },
    include: figureWithAllAssetsInclude,
  });
}

export async function createFigure(userId: string, input: CreateFigureInput) {
  return prisma.figure.create({
    data: { userId, name: input.name, type: input.type, metadata: input.metadata as never },
    include: figureWithAllAssetsInclude,
  });
}

export async function updateFigure(userId: string, id: string, input: UpdateFigureInput) {
  const data = {
    name: input.name,
    type: input.type,
    metadata: input.metadata as never,
  };

  if (isObjectIdLike(id)) {
    const existing = await prisma.figure.findFirst({ where: { id, userId } });
    if (!existing) return null;
    return prisma.figure.update({ where: { id }, data });
  }

  const existing = await prisma.figure.findFirst({ where: { name: id, userId } });
  if (!existing) return null;
  return prisma.figure.update({ where: { id: existing.id }, data });
}

export async function deleteFigure(userId: string, id: string) {
  if (isObjectIdLike(id)) {
    const existing = await prisma.figure.findFirst({ where: { id, userId } });
    if (!existing) return null;
    return prisma.figure.delete({ where: { id } });
  }

  const existing = await prisma.figure.findFirst({
    where: { name: id, userId },
    include: figureWithAllAssetsInclude,
  });
  if (!existing) return null;
  await prisma.figure.delete({ where: { id: existing.id } });
  return existing;
}

export async function resolveSkin(userId: string, figureId: string, skinName?: string | null) {
  // Verify figure belongs to user first
  const figure = await prisma.figure.findFirst({ where: { id: figureId, userId } });
  if (!figure) return null;

  return skinName && skinName.trim()
    ? prisma.skin.findFirst({ where: { figureId, name: skinName.trim() } })
    : prisma.skin.findFirst({ where: { figureId, isBase: true } });
}

export async function upsertSkinVariant(args: {
  skinId: string;
  variant: string;
  imageModel: string;
  prompt: string;
  negativePrompt?: string;
}) {
  const { skinId, variant, imageModel, prompt, negativePrompt } = args;

  return prisma.skinVariant.upsert({
    where: { skinId_variant: { skinId, variant } },
    update: { imageModel, prompt, negativePrompt: negativePrompt ?? null },
    create: {
      skinId,
      variant,
      imageModel,
      prompt,
      negativePrompt: negativePrompt ?? null,
    },
  });
}
