export interface CreateProjectInput {
  name: string;
}

export interface UpdateProjectInput {
  name?: string;
}

export interface AddFigureToProjectInput {
  figureId: string;
}
