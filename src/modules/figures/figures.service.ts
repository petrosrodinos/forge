import { prisma } from "../../db/client";
import type { CreateFigureInput, UpdateFigureInput } from "./figures.types";
import { getAiml } from "../../services";
import * as skinImageSvc from "../skin-images/skin-images.service";

function isObjectIdLike(value: string) {
  // Prisma's `@db.ObjectId` fields expect a 24-hex string.
  return /^[a-fA-F0-9]{24}$/.test(value);
}

export async function listFigures() {
  return prisma.figure.findMany({
    include: {
      skins: {
        include: {
          variants: {
            include: {
              images: {
                orderBy: { createdAt: "desc" },
                include: {
                  models: {
                    include: { animations: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { isBase: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getFigureById(id: string) {
  if (isObjectIdLike(id)) {
    return prisma.figure.findUnique({
      where: { id },
      include: {
        skins: {
          include: {
            variants: {
              include: {
                images: {
                  include: { models: { include: { animations: true } } },
                },
              },
            },
          },
        },
      },
    });
  }

  return prisma.figure.findFirst({
    where: { name: id },
    include: {
      skins: {
        include: {
          variants: {
            include: {
              images: {
                include: { models: { include: { animations: true } } },
              },
            },
          },
        },
      },
    },
  });
}

export async function createFigure(input: CreateFigureInput) {
  return prisma.figure.create({
    data: { name: input.name, type: input.type, metadata: input.metadata as never },
  });
}

export async function updateFigure(id: string, input: UpdateFigureInput) {
  const data = {
    name: input.name,
    type: input.type,
    metadata: input.metadata as never,
  };

  if (isObjectIdLike(id)) {
    return prisma.figure.update({ where: { id }, data });
  }

  // Avoid `updateMany` (Prisma needs MongoDB replica set for transactions).
  // Instead, resolve the figure first, then update by its unique `id`.
  const existing = await prisma.figure.findFirst({ where: { name: id } });
  if (!existing) return null;
  return prisma.figure.update({ where: { id: existing.id }, data });
}

export async function deleteFigure(id: string) {
  if (isObjectIdLike(id)) return prisma.figure.delete({ where: { id } });

  const existing = await prisma.figure.findFirst({
    where: { name: id },
    include: {
      skins: {
        include: {
          variants: {
            include: {
              images: {
                include: { models: { include: { animations: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!existing) return null;
  await prisma.figure.delete({ where: { id: existing.id } });
  return existing;
}

interface GenerateFigureImageInput {
  figureId: string;
  skinName?: string | null;
  variant: "A" | "B";
  model?: string;
  prompt: string;
  negativePrompt?: string;
  size?: string;
  steps?: number;
}

export async function generateAndSaveFigureImage(input: GenerateFigureImageInput) {
  const {
    figureId,
    skinName,
    variant,
    model = "flux/schnell",
    prompt,
    negativePrompt,
    size,
    steps,
  } = input;

  const resolvedSkin =
    skinName && skinName.trim()
      ? await prisma.skin.findFirst({ where: { figureId, name: skinName.trim() } })
      : await prisma.skin.findFirst({ where: { figureId, isBase: true } });

  if (!resolvedSkin) {
    throw new Error("Skin not found for figure");
  }

  const variantRecord = await prisma.skinVariant.upsert({
    where: { skinId_variant: { skinId: resolvedSkin.id, variant } },
    update: { imageModel: model, prompt, negativePrompt: negativePrompt ?? null },
    create: {
      skinId: resolvedSkin.id,
      variant,
      imageModel: model,
      prompt,
      negativePrompt: negativePrompt ?? null,
    },
  });

  const generated = await getAiml().generateImage({
    model,
    prompt,
    size,
    steps,
  });

  const first = generated.data?.[0];
  const imageUrl =
    first?.url ??
    (first?.b64_json ? `data:image/png;base64,${first.b64_json}` : null);

  if (!imageUrl) throw new Error("No image in generation response");

  const savedImage = await skinImageSvc.createSkinImage(
    variantRecord.id,
    figureId,
    imageUrl
  );

  return {
    imageUrl,
    skinId: resolvedSkin.id,
    variantId: variantRecord.id,
    image: savedImage,
  };
}
