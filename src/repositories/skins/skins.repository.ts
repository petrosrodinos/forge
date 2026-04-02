import { prisma } from "../../db/client";
import type { CreateSkinInput } from "../../interfaces/skins/skins.types";

export async function listSkins(figureId: string) {
  return prisma.skin.findMany({
    where: { figureId },
    include: { variants: { include: { images: { include: { models: { include: { animations: true } } } } } } },
    orderBy: [{ isBase: "desc" }, { createdAt: "asc" }],
  });
}

export async function createSkin(figureId: string, input: CreateSkinInput) {
  return prisma.skin.create({
    data: { figureId, name: input.name, isBase: input.isBase ?? false },
  });
}

export async function setBaseSkin(figureId: string, skinId: string) {
  await prisma.skin.updateMany({ where: { figureId }, data: { isBase: false } });
  return prisma.skin.update({ where: { id: skinId }, data: { isBase: true } });
}

export async function deleteSkin(id: string) {
  return prisma.skin.delete({ where: { id } });
}

