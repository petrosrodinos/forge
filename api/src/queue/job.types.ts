export const JOB_NAMES = {
  MESH_FROM_IMAGE: "mesh:from-image",
  MESH_FROM_IMAGES: "mesh:from-images",
  RIG: "rig",
  ANIMATE: "animate",
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

export type MeshFromImageJobData = {
  model3dId: string;
  imageId: string;
  userId: string;
  tokenUsageIdempotencyKey: string;
};

export type MeshFromImagesJobData = {
  model3dId: string;
  imageIds: string[];
  userId: string;
  tokenUsageIdempotencyKey: string;
};

export type RigJobData = {
  model3dId: string;
  userId: string;
  tokenUsageIdempotencyKey: string;
};

export type AnimateJobData = {
  model3dId: string;
  rigTaskId: string;
  animations: string[];
  userId: string;
  tokenUsageIdempotencyKey: string;
};
