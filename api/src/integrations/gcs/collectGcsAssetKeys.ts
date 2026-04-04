type Model3DWithAnims = {
  gcsPbrModelKey?: string | null;
  gcsModelKey?: string | null;
  animations?: Array<{ gcsGlbKey?: string | null }>;
};

type SkinImageWithModels = {
  gcsKey?: string | null;
  models?: Model3DWithAnims[];
};

type VariantWithImages = { images?: SkinImageWithModels[] };

type SkinWithVariants = { variants?: VariantWithImages[] };

type FigureWithSkins = { skins?: SkinWithVariants[] };

export function collectGcsKeysFromModel3D(model: Model3DWithAnims): string[] {
  const keys: string[] = [];
  if (model.gcsPbrModelKey) keys.push(model.gcsPbrModelKey);
  if (model.gcsModelKey) keys.push(model.gcsModelKey);
  for (const a of model.animations ?? []) {
    if (a.gcsGlbKey) keys.push(a.gcsGlbKey);
  }
  return keys;
}

export function collectGcsKeysFromSkinImage(image: SkinImageWithModels): string[] {
  const keys: string[] = [];
  if (image.gcsKey) keys.push(image.gcsKey);
  for (const m of image.models ?? []) {
    keys.push(...collectGcsKeysFromModel3D(m));
  }
  return keys;
}

export function collectGcsKeysFromVariant(variant: VariantWithImages): string[] {
  const keys: string[] = [];
  for (const img of variant.images ?? []) {
    keys.push(...collectGcsKeysFromSkinImage(img));
  }
  return keys;
}

export function collectGcsKeysFromSkin(skin: SkinWithVariants): string[] {
  const keys: string[] = [];
  for (const v of skin.variants ?? []) {
    keys.push(...collectGcsKeysFromVariant(v));
  }
  return keys;
}

export function collectGcsKeysFromFigure(figure: FigureWithSkins): string[] {
  const keys: string[] = [];
  for (const s of figure.skins ?? []) {
    keys.push(...collectGcsKeysFromSkin(s));
  }
  return keys;
}
