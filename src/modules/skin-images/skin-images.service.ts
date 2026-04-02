import { prisma } from "../../db/client";
import { archiveRemoteUrl } from "../../integrations/gcs/gcs.service";

export async function createSkinImage(
  variantId: string,
  figureId: string,
  sourceUrl: string,
) {
  const image = await prisma.skinImage.create({
    data: { variantId, sourceUrl },
  });

  const ext    = sourceUrl.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)?.[1] ?? "jpg";
  const gcsKey = `images/figures/${figureId}/${variantId}/${image.id}.${ext}`;

  try {
    const { gcsUrl, gcsBucket } = await archiveRemoteUrl(sourceUrl, gcsKey, `image/${ext}`);
    return prisma.skinImage.update({
      where: { id: image.id },
      data:  { gcsUrl, gcsBucket, gcsKey },
    });
  } catch (err) {
    console.warn(`GCS upload failed for image ${image.id}:`, err);
    return image;
  }
}

export async function listImages(variantId: string) {
  return prisma.skinImage.findMany({
    where:   { variantId },
    include: { models: { include: { animations: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteImage(id: string) {
  return prisma.skinImage.delete({ where: { id } });
}
