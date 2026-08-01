export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    figures: number;
  };
}

export interface CreateProjectDto {
  name: string;
}

export interface UpdateProjectDto {
  name?: string;
}

export interface UpdateProjectParams {
  id: string;
  dto: UpdateProjectDto;
}

export interface AddFigureToProjectParams {
  projectId: string;
  figureId: string;
}

export interface RemoveFigureFromProjectParams {
  projectId: string;
  figureId: string;
}
