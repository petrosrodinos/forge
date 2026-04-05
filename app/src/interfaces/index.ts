export interface Animation {
  id: string;
  model3dId: string;
  animationKey: string;
  gcsGlbUrl: string | null;
  status: string;
  error?: string;
  createdAt: string;
}

export interface Model3D {
  id: string;
  imageId: string;
  status: string;
  error?: string;
  gcsPbrModelUrl: string | null;
  gcsModelUrl: string | null;
  meshTaskId?: string;
  rigTaskId?: string;
  animations: Animation[];
  createdAt: string;
  updatedAt: string;
}

export interface SkinImage {
  id: string;
  variantId: string;
  sourceUrl: string;
  gcsUrl: string | null;
  models: Model3D[];
  createdAt: string;
}

export interface SkinVariant {
  id: string;
  skinId: string;
  variant: string;
  name: string | null;
  prompt: string | null;
  negativePrompt: string | null;
  imageModel: string | null;
  images: SkinImage[];
}

export interface Skin {
  id: string;
  figureId: string;
  name: string | null;
  isBase: boolean;
  variants: SkinVariant[];
}

export interface Figure {
  id: string;
  name: string;
  type: string;
  skins: Skin[];
}

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  tokenBalance: number;
}
