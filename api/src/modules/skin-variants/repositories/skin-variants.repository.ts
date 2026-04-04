import { prisma } from "../../../integrations/db/client";
import type { CreateVariantInput, UpsertVariantInput } from "../interfaces/skin-variants.types";

export async function upsertVariant(skinId: string, input: UpsertVariantInput) {
  return prisma.skinVariant.upsert({
    where: { skinId_variant: { skinId, variant: input.variant } },
    update: { name: input.name, prompt: input.prompt, negativePrompt: input.negativePrompt, imageModel: input.imageModel },
    create: {
      skinId,
      variant: input.variant,
      name: input.name,
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      imageModel: input.imageModel,
    },
    include: { images: { include: { models: { include: { animations: true } } } } },
  });
}

export async function getVariant(skinId: string, variant: string) {
  return prisma.skinVariant.findUnique({
    where: { skinId_variant: { skinId, variant } },
    include: { images: { include: { models: { include: { animations: true } } } } },
  });
}

export async function createVariant(skinId: string, input: CreateVariantInput) {
  const count = await prisma.skinVariant.count({ where: { skinId } });
  const variant = String.fromCharCode(65 + count); // A, B, C...
  return prisma.skinVariant.create({
    data: { skinId, variant, name: input.name },
    include: { images: { include: { models: { include: { animations: true } } } } },
  });
}

export async function deleteVariantById(id: string) {
  return prisma.skinVariant.delete({ where: { id } });
}

