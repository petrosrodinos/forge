import type { UpsertVariantInput } from "../../interfaces/skin-variants/skin-variants.types";
import { getVariant as getVariantRepo, upsertVariant as upsertVariantRepo } from "../../repositories/skin-variants/skin-variants.repository";

export async function upsertVariant(skinId: string, input: UpsertVariantInput) {
  return upsertVariantRepo(skinId, input);
}

export async function getVariant(skinId: string, variant: string) {
  return getVariantRepo(skinId, variant);
}
