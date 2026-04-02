export type PipelineProgressEmitter = (payload: {
  step: string;
  status: string;
  data?: Record<string, unknown>;
}) => void;

export type PipelineSseEventEmitter = (event: string, data: Record<string, unknown>) => void;

export interface RunPipelineOpts {
  figureId: string;
  variantId: string;
  imageBuffer: Buffer;
  filename: string;
  mimeType: "image/png" | "image/jpeg";
  animations: string[];
  modelVersion: string;

  emitProgress: PipelineProgressEmitter;
  emitEvent: PipelineSseEventEmitter;
}

