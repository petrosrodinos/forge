export interface DownloadImageItem {
  imageId: string;
  url: string;
  filename: string;
}

export interface DownloadModelItem {
  modelId: string;
  url: string;
  filename: string;
}

export interface DownloadVariantSelection {
  variantId: string;
  variantLetter: string;
  images: DownloadImageItem[];
  models: DownloadModelItem[];
}

export interface DownloadSkinSelection {
  skinId: string;
  skinName: string;
  variants: DownloadVariantSelection[];
}

export interface DownloadFigureSelection {
  figureId: string;
  figureName: string;
  skins: DownloadSkinSelection[];
}

export interface DownloadZipRequest {
  selections: DownloadFigureSelection[];
}
