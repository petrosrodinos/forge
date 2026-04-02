import { prisma } from "../../db/client";
import { archiveRemoteUrl } from "../../integrations/gcs/gcs.service";

export async function createAnimation(model3dId: string, animationKey: string) {
  return prisma.animation.create({
    data: { model3dId, animationKey, status: "pending" },
  });
}

export async function finalizeAnimation(
  id: string,
  model3dId: string,
  animationKey: string,
  tripoGlbUrl: string,
) {
  const safeKey = animationKey.replace(/[^a-z0-9_:.-]/gi, "_");
  const gcsKey  = `animations/${model3dId}/${safeKey}_${id}.glb`;
  const { gcsUrl } = await archiveRemoteUrl(tripoGlbUrl, gcsKey, "model/gltf-binary");

  return prisma.animation.update({
    where: { id },
    data:  { status: "success", glbSourceUrl: tripoGlbUrl, gcsGlbUrl: gcsUrl, gcsGlbKey: gcsKey },
  });
}

export async function failAnimation(id: string, error: string) {
  return prisma.animation.update({ where: { id }, data: { status: "failed", error } });
}

export async function listAnimations(model3dId: string) {
  return prisma.animation.findMany({ where: { model3dId }, orderBy: { createdAt: "asc" } });
}
