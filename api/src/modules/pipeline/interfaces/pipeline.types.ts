import type { Prisma } from "../../../generated/prisma/client";

export type PipelineProgressEmitter = (payload: {
  step: string;
  status: string;
  data?: Record<string, unknown>;
}) => void;

export type PipelineSseEventEmitter = (
  event: string,
  data: Record<string, unknown>,
) => void;

export interface RunPipelineOpts {
  figureId: string;
  variantId: string;
  /** Existing skin image ID — when provided, skips GCS upload and image record creation. */
  skinImageId?: string;
  imageBuffer: Buffer;
  filename: string;
  mimeType: "image/png" | "image/jpeg";
  modelVersion: string;

  emitProgress: PipelineProgressEmitter;
  emitEvent: PipelineSseEventEmitter;

  /** Fires when Tripo accepts the mesh task (for token-usage provider metadata). */
  onMeshTaskCostsMetadata?: (costsMetadata: Prisma.InputJsonValue) => void | Promise<void>;
}
