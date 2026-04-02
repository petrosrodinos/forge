export interface CreateFigureDto {
  name: string;
  type: string;
}

export interface UpdateFigureDto {
  name?: string;
  type?: string;
}
