import { prisma } from "../../db/client";
import { archiveRemoteUrl } from "../../integrations/gcs/gcs.service";
import type { TaskIds, TripoModelUrls } from "./models3d.types";

export async function createModel3D(imageId: string) {
  return prisma.model3D.create({ data: { imageId, status: "pending" } });
}

export async function updateModel3DProcessing(id: string, taskIds: TaskIds) {
  return prisma.model3D.update({
    where: { id },
    data:  { status: "processing", ...taskIds },
  });
}

export async function finalizeModel3D(id: string, _modelId: string, tripoUrls: TripoModelUrls) {
  const [pbr, plain] = await Promise.all([
    archiveRemoteUrl(tripoUrls.pbrModelSourceUrl, `models3d/${id}/pbr.glb`,   "model/gltf-binary"),
    archiveRemoteUrl(tripoUrls.modelSourceUrl,    `models3d/${id}/model.glb`, "model/gltf-binary"),
  ]);

  return prisma.model3D.update({
    where: { id },
    data:  {
      status:            "success",
      pbrModelSourceUrl: tripoUrls.pbrModelSourceUrl,
      modelSourceUrl:    tripoUrls.modelSourceUrl,
      gcsPbrModelUrl:    pbr.gcsUrl,
      gcsPbrModelKey:    pbr.gcsKey,
      gcsModelUrl:       plain.gcsUrl,
      gcsModelKey:       plain.gcsKey,
    },
  });
}

export async function failModel3D(id: string, error: string) {
  return prisma.model3D.update({ where: { id }, data: { status: "failed", error } });
}

export async function getModel3D(id: string) {
  return prisma.model3D.findUnique({ where: { id }, include: { animations: true } });
}
