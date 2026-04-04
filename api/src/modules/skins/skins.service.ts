import { deleteGcsFiles } from "../../integrations/gcs/gcs.service";
import { collectGcsKeysFromSkin } from "../../integrations/gcs/collectGcsAssetKeys";
import type { CreateSkinInput } from "./interfaces/skins.types";
import {
  createSkin as createSkinRepo,
  deleteSkin as deleteSkinRepo,
  findSkinWithGcsAssets,
  listSkins as listSkinsRepo,
  setBaseSkin as setBaseSkinRepo,
  updateSkin as updateSkinRepo,
} from "./repositories/skins.repository";

export async function listSkins(figureId: string) {
  return listSkinsRepo(figureId);
}

export async function createSkin(figureId: string, input: CreateSkinInput) {
  return createSkinRepo(figureId, input);
}

export async function updateSkin(id: string, name: string) {
  return updateSkinRepo(id, name);
}

export async function setBaseSkin(figureId: string, skinId: string) {
  return setBaseSkinRepo(figureId, skinId);
}

export async function deleteSkin(id: string) {
  const existing = await findSkinWithGcsAssets(id);
  if (existing) await deleteGcsFiles(collectGcsKeysFromSkin(existing));
  return deleteSkinRepo(id);
}

