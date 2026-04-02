import { prisma } from "../../db/client";
import type { TaskIds, TripoModelUrls } from "../../interfaces/models3d/models3d.types";

export async function createModel3D(imageId: string) {
  return prisma.model3D.create({ data: { imageId, status: "pending" } });
}

export async function updateModel3DProcessing(id: string, taskIds: TaskIds) {
  return prisma.model3D.update({
    where: { id },
    data: { status: "processing", ...taskIds },
  });
}

export async function setModel3DSuccess(args: {
  id: string;
  tripoUrls: TripoModelUrls;
  gcsPbr: { gcsUrl: string; gcsKey: string };
  gcsPlain: { gcsUrl: string; gcsKey: string };
}) {
  const { id, tripoUrls, gcsPbr, gcsPlain } = args;
  return prisma.model3D.update({
    where: { id },
    data: {
      status: "success",
      pbrModelSourceUrl: tripoUrls.pbrModelSourceUrl,
      modelSourceUrl: tripoUrls.modelSourceUrl,
      gcsPbrModelUrl: gcsPbr.gcsUrl,
      gcsPbrModelKey: gcsPbr.gcsKey,
      gcsModelUrl: gcsPlain.gcsUrl,
      gcsModelKey: gcsPlain.gcsKey,
    },
  });
}

export async function setModel3DFailed(id: string, error: string) {
  return prisma.model3D.update({ where: { id }, data: { status: "failed", error } });
}

export async function getModel3D(id: string) {
  return prisma.model3D.findUnique({ where: { id }, include: { animations: true } });
}

