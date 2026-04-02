export interface AnimationRecord {
  id: string;
  model3dId: string;
  animationKey: string;
  retargetTaskId: string | null;
  glbSourceUrl: string | null;
  gcsGlbUrl: string | null;
  gcsGlbKey: string | null;
  status: string;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

