import { prisma } from "../../db/client";
import type { CreateFigureInput, UpdateFigureInput } from "../../interfaces/figures/figures.types";
import { isObjectIdLike } from "../../helpers/objectIdLike.helper";

export async function listFigures() {
  return prisma.figure.findMany({
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

export async function getFigureById(id: string) {
  if (isObjectIdLike(id)) {
    return prisma.figure.findUnique({
      where: { id },
      include: {
        skins: {
          include: {
            variants: {
              include: {
                images: {
                  include: { models: { include: { animations: true } } },
                },
              },
            },
          },
        },
      },
    });
  }

  return prisma.figure.findFirst({
    where: { name: id },
    include: {
      skins: {
        include: {
          variants: {
            include: {
              images: {
                include: { models: { include: { animations: true } } },
              },
            },
          },
        },
      },
    },
  });
}

export async function createFigure(input: CreateFigureInput) {
  return prisma.figure.create({
    data: { name: input.name, type: input.type, metadata: input.metadata as never },
  });
}

export async function updateFigure(id: string, input: UpdateFigureInput) {
  const data = {
    name: input.name,
    type: input.type,
    metadata: input.metadata as never,
  };

  if (isObjectIdLike(id)) {
    return prisma.figure.update({ where: { id }, data });
  }

  // Avoid `updateMany` (Prisma needs MongoDB replica set for transactions).
  // Instead, resolve the figure first, then update by its unique `id`.
  const existing = await prisma.figure.findFirst({ where: { name: id } });
  if (!existing) return null;
  return prisma.figure.update({ where: { id: existing.id }, data });
}

export async function deleteFigure(id: string) {
  if (isObjectIdLike(id)) return prisma.figure.delete({ where: { id } });

  const existing = await prisma.figure.findFirst({
    where: { name: id },
    include: {
      skins: {
        include: {
          variants: {
            include: {
              images: {
                include: { models: { include: { animations: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!existing) return null;
  await prisma.figure.delete({ where: { id: existing.id } });
  return existing;
}

export async function resolveSkin(figureId: string, skinName?: string | null) {
  const resolvedSkin =
    skinName && skinName.trim()
      ? await prisma.skin.findFirst({ where: { figureId, name: skinName.trim() } })
      : await prisma.skin.findFirst({ where: { figureId, isBase: true } });
  return resolvedSkin;
}

export async function upsertSkinVariant(args: {
  skinId: string;
  variant: "A" | "B";
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

