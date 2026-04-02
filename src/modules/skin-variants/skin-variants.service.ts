import { prisma } from "../../db/client";
import type { UpsertVariantInput } from "./skin-variants.types";

export async function upsertVariant(skinId: string, input: UpsertVariantInput) {
  return prisma.skinVariant.upsert({
    where:  { skinId_variant: { skinId, variant: input.variant } },
    update: { prompt: input.prompt, negativePrompt: input.negativePrompt, imageModel: input.imageModel },
    create: { skinId, variant: input.variant, prompt: input.prompt, negativePrompt: input.negativePrompt, imageModel: input.imageModel },
    include: { images: { include: { models: { include: { animations: true } } } } },
  });
}

export async function getVariant(skinId: string, variant: string) {
  return prisma.skinVariant.findUnique({
    where:   { skinId_variant: { skinId, variant } },
    include: { images: { include: { models: { include: { animations: true } } } } },
  });
}
