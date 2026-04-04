export interface PipelineStep {
  step: string;
  status: string;
  [k: string]: unknown;
}

export interface AnimationStreamItem {
  animationKey: string;
  gcsGlbUrl: string;
  status: string;
}

export interface PipelineResult {
  model3dId: string;
  gcsPbrModelUrl: string;
  gcsModelUrl: string;
  /** Present when the pipeline completes with animation outputs */
  animations?: AnimationStreamItem[];
}

export interface AnimateResult {
  animations: AnimationStreamItem[];
}
