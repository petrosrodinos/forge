import { prisma } from "../../db/client";
import type { CreateFigureInput, UpdateFigureInput } from "./figures.types";

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

export async function createFigure(input: CreateFigureInput) {
  return prisma.figure.create({
    data: { name: input.name, type: input.type, metadata: input.metadata as never },
  });
}

export async function updateFigure(id: string, input: UpdateFigureInput) {
  return prisma.figure.update({
    where: { id },
    data:  { name: input.name, type: input.type, metadata: input.metadata as never },
  });
}

export async function deleteFigure(id: string) {
  return prisma.figure.delete({ where: { id } });
}
