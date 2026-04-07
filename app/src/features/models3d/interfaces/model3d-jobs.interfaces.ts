export interface AnimationStreamItem {
  animationKey: string;
  gcsGlbUrl: string;
  status: string;
}

export interface AnimateResult {
  animations: AnimationStreamItem[];
}

export interface RigCompletePayload {
  model3dId: string;
  rigTaskId: string;
}
