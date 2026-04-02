import { prisma } from "../../db/client";

export async function createAnimation(model3dId: string, animationKey: string) {
  return prisma.animation.create({
    data: { model3dId, animationKey, status: "pending" },
  });
}

export async function setAnimationSuccess(args: {
  id: string;
  tripoGlbUrl: string;
  gcsGlbUrl: string;
  gcsGlbKey: string;
}) {
  const { id, tripoGlbUrl, gcsGlbUrl, gcsGlbKey } = args;
  return prisma.animation.update({
    where: { id },
    data: {
      status: "success",
      glbSourceUrl: tripoGlbUrl,
      gcsGlbUrl,
      gcsGlbKey,
    },
  });
}

export async function setAnimationFailed(id: string, error: string) {
  return prisma.animation.update({ where: { id }, data: { status: "failed", error } });
}

export async function listAnimations(model3dId: string) {
  return prisma.animation.findMany({ where: { model3dId }, orderBy: { createdAt: "asc" } });
}

