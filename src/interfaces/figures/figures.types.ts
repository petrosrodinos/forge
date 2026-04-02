export interface CreateFigureInput {
  name: string;
  type: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateFigureInput {
  name?: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

