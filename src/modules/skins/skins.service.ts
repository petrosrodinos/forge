import type { CreateSkinInput } from "../../interfaces/skins/skins.types";
import {
  createSkin as createSkinRepo,
  deleteSkin as deleteSkinRepo,
  listSkins as listSkinsRepo,
  setBaseSkin as setBaseSkinRepo,
} from "../../repositories/skins/skins.repository";

export async function listSkins(figureId: string) {
  return listSkinsRepo(figureId);
}

export async function createSkin(figureId: string, input: CreateSkinInput) {
  return createSkinRepo(figureId, input);
}

export async function setBaseSkin(figureId: string, skinId: string) {
  return setBaseSkinRepo(figureId, skinId);
}

export async function deleteSkin(id: string) {
  return deleteSkinRepo(id);
}

