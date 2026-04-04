export interface CreateSkinDto {
  name: string;
}

export interface CreateSkinParams {
  figureId: string;
  name: string;
}

export interface UpdateSkinParams {
  figureId: string;
  skinId: string;
  name: string;
}

export interface DeleteSkinParams {
  figureId: string;
  skinId: string;
}
