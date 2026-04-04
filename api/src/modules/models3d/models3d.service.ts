import { archiveRemoteUrl, deleteGcsFiles } from "../../integrations/gcs/gcs.service";
import { collectGcsKeysFromModel3D } from "../../integrations/gcs/collectGcsAssetKeys";
import type { TaskIds, TripoModelUrls } from "./interfaces/models3d.types";
import {
  createModel3D as createModel3DRepo,
  deleteModel3D as deleteModel3DRepo,
  getModel3D as getModel3DRepo,
  setModel3DFailed,
  setModel3DSuccess,
  updateModel3DProcessing as updateModel3DProcessingRepo,
} from "./repositories/models3d.repository";
import { MODELS3D_CONFIG } from "./config/models3d.config";

export async function createModel3D(imageId: string) {
  return createModel3DRepo(imageId);
}

export async function updateModel3DProcessing(id: string, taskIds: TaskIds) {
  return updateModel3DProcessingRepo(id, taskIds);
}

export async function finalizeModel3D(id: string, _modelId: string, tripoUrls: TripoModelUrls) {
  const [pbr, plain] = await Promise.all([
    archiveRemoteUrl(tripoUrls.pbrModelSourceUrl, `models3d/${id}/pbr.glb`,   MODELS3D_CONFIG.MODEL_GLTF_BINARY_CONTENT_TYPE),
    archiveRemoteUrl(tripoUrls.modelSourceUrl,    `models3d/${id}/model.glb`, MODELS3D_CONFIG.MODEL_GLTF_BINARY_CONTENT_TYPE),
  ]);

  return setModel3DSuccess({
    id,
    tripoUrls,
    gcsPbr: { gcsUrl: pbr.gcsUrl, gcsKey: pbr.gcsKey },
    gcsPlain: { gcsUrl: plain.gcsUrl, gcsKey: plain.gcsKey },
  });
}

export async function failModel3D(id: string, error: string) {
  return setModel3DFailed(id, error);
}

export async function getModel3D(id: string) {
  return getModel3DRepo(id);
}

export async function deleteModel3D(id: string) {
  const existing = await getModel3DRepo(id);
  if (existing) await deleteGcsFiles(collectGcsKeysFromModel3D(existing));
  return deleteModel3DRepo(id);
}
