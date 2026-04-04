import { archiveRemoteUrl, deleteGcsFiles } from "../../integrations/gcs/gcs.service";
import { collectGcsKeysFromSkinImage } from "../../integrations/gcs/collectGcsAssetKeys";
import {
  createSkinImageRecord,
  deleteImage as deleteImageRepo,
  findSkinImageWithGcsAssets,
  getSkinImageById,
  listImages as listImagesRepo,
  updateSkinImageGcs,
} from "./repositories/skin-images.repository";

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
