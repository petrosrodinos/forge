export type MeshTextureQuality = "standard" | "detailed" | "extreme";
export type MeshGeometryQuality = "standard" | "detailed";

export type TrippoMeshModelVersion =
  | "v3.1-20260211"
  | "v3.0-20250812"
  | "v2.5-20250123"
  | "P1-20260311";

export type MeshGenerationOptions = {
  model: TrippoMeshModelVersion;
  textureQuality: MeshTextureQuality;
  geometryQuality: MeshGeometryQuality;
};

export const DEFAULT_MESH_OPTIONS: MeshGenerationOptions = {
  model: "v3.1-20260211",
  textureQuality: "standard",
  geometryQuality: "standard",
};
