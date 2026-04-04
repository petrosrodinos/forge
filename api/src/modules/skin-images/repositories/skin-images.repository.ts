import { prisma } from "../../../integrations/db/client";

export async function createSkinImageRecord(variantId: string, figureId: string, sourceUrl: string) {
  return prisma.skinImage.create({
    data: { variantId, sourceUrl },
  });
}

export async function updateSkinImageGcs(args: {
  id: string;
  gcsUrl: string;
  gcsBucket: string;
  gcsKey: string;
}) {
  const { id, gcsUrl, gcsBucket, gcsKey } = args;
  return prisma.skinImage.update({
    where: { id },
    data: { gcsUrl, gcsBucket, gcsKey },
  });
}

export async function listImages(variantId: string) {
  return prisma.skinImage.findMany({
    where: { variantId },
    include: { models: { include: { animations: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSkinImageById(id: string) {
  return prisma.skinImage.findUnique({ where: { id } });
}

export async function findSkinImageWithGcsAssets(id: string) {
  return prisma.skinImage.findUnique({
    where: { id },
    include: { models: { include: { animations: true } } },
  });
}

export async function deleteImage(id: string) {
  return prisma.skinImage.delete({ where: { id } });
}

