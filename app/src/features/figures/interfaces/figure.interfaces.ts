export interface CreateFigureDto {
  name: string;
  type: string;
}

export interface UpdateFigureDto {
  name?: string;
  type?: string;
}

export interface UpdateFigureParams {
  id: string;
  dto: UpdateFigureDto;
}

export interface GenerateAiVariantDto {
  figureId: string;
  prompt?: string;
}

export interface GenerateAiVariantResponse {
  prompt: string;
}
