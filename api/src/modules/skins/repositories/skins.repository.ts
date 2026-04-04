import { prisma } from "../../../integrations/db/client";
import type { CreateSkinInput } from "../interfaces/skins.types";

const VARIANT_INCLUDE = {
  variants: {
    include: {
      images: {
        orderBy: { createdAt: "desc" as const },
        include: { models: { include: { animations: true } } },
      },
    },
  },
} as const;

export async function listSkins(figureId: string) {
  return prisma.skin.findMany({
    where: { figureId },
    include: VARIANT_INCLUDE,
    orderBy: [{ isBase: "desc" }, { createdAt: "asc" }],
  });
}

export async function createSkin(figureId: string, input: CreateSkinInput) {
  return prisma.skin.create({
    data: { figureId, name: input.name, isBase: input.isBase ?? false },
    include: VARIANT_INCLUDE,
  });
}

export async function updateSkin(id: string, name: string) {
  return prisma.skin.update({
    where: { id },
    data: { name },
    include: VARIANT_INCLUDE,
  });
}

export async function setBaseSkin(figureId: string, skinId: string) {
  await prisma.skin.updateMany({ where: { figureId }, data: { isBase: false } });
  return prisma.skin.update({ where: { id: skinId }, data: { isBase: true } });
}

export async function findSkinWithGcsAssets(id: string) {
  return prisma.skin.findUnique({
    where: { id },
    include: VARIANT_INCLUDE,
  });
}

export async function deleteSkin(id: string) {
  return prisma.skin.delete({ where: { id } });
}

