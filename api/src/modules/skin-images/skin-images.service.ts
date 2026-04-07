import { prisma } from "../../integrations/db/client";
import { archiveRemoteUrl, deleteGcsFiles, uploadBuffer } from "../../integrations/gcs/gcs.service";
import { collectGcsKeysFromSkinImage } from "../../integrations/gcs/collectGcsAssetKeys";
import {
  createSkinImageRecord,
  deleteImage as deleteImageRepo,
  findSkinImageWithGcsAssets,
  getSkinImageById,
  listImages as listImagesRepo,
  updateSkinImageGcs,
} from "./repositories/skin-images.repository";

/** Create a skin image from an uploaded buffer only (raster only; no mesh generation). */
export async function createSkinImageFromUpload(
  variantId: string,
  figureId: string,
  buffer: Buffer,
  mimeType: "image/png" | "image/jpeg",
) {
  const ext = mimeType === "image/jpeg" ? "jpg" : "png";
  const image = await createSkinImageRecord(variantId, figureId, "upload://local");
  const gcsKey = `images/figures/${figureId}/${variantId}/${image.id}.${ext}`;
  try {
    const { gcsUrl, gcsBucket } = await uploadBuffer(buffer, gcsKey, mimeType);
    return prisma.skinImage.update({
      where: { id: image.id },
      data: { gcsUrl, gcsBucket, gcsKey, sourceUrl: gcsUrl },
    });
  } catch (err) {
    await prisma.skinImage.delete({ where: { id: image.id } }).catch(() => {});
    throw err;
  }
}

export async function createSkinImage(
  variantId: string,
  figureId: string,
  sourceUrl: string,
) {
  const image = await createSkinImageRecord(variantId, figureId, sourceUrl);

  const ext    = sourceUrl.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)?.[1] ?? "jpg";
  const gcsKey = `images/figures/${figureId}/${variantId}/${image.id}.${ext}`;

  try {
    const { gcsUrl, gcsBucket } = await archiveRemoteUrl(sourceUrl, gcsKey, `image/${ext}`);
    return updateSkinImageGcs({ id: image.id, gcsUrl, gcsBucket, gcsKey });
  } catch (err) {
    console.warn(`GCS upload failed for image ${image.id}:`, err);
    return image;
  }
}

export async function getSkinImage(id: string) {
  return getSkinImageById(id);
}

export async function listImages(variantId: string) {
  return listImagesRepo(variantId);
}

export async function deleteImage(id: string) {
  const existing = await findSkinImageWithGcsAssets(id);
  if (existing) await deleteGcsFiles(collectGcsKeysFromSkinImage(existing));
  return deleteImageRepo(id);
}

/** Replace raster for an existing skin image, remove prior 3D models and their GCS assets, then upload new source. */
export async function replaceSkinImageSourceFromUpload(args: {
  imageId: string;
  variantId: string;
  figureId: string;
  buffer: Buffer;
  mimeType: "image/png" | "image/jpeg";
}) {
  const { imageId, variantId, figureId, buffer, mimeType } = args;
  const existing = await findSkinImageWithGcsAssets(imageId);
  if (!existing || existing.variantId !== variantId) {
    throw new Error("Skin image not found");
  }

  await deleteGcsFiles(collectGcsKeysFromSkinImage(existing));
  await prisma.model3D.deleteMany({ where: { imageId } });

  const ext = mimeType === "image/jpeg" ? "jpg" : "png";
  const gcsKey = `images/figures/${figureId}/${variantId}/${imageId}-${Date.now()}.${ext}`;
  const { gcsUrl, gcsBucket } = await uploadBuffer(buffer, gcsKey, mimeType);

  return prisma.skinImage.update({
    where: { id: imageId },
    data: { gcsUrl, gcsBucket, gcsKey, sourceUrl: gcsUrl },
  });
}
