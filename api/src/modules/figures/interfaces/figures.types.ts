export interface CreateFigureInput {
  name: string;
  type: string;
  metadata?: Record<string, unknown>;
  projectId?: string;
}

export interface UpdateFigureInput {
  name?: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

