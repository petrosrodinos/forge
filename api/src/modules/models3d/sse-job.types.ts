export type TripoJobProgressEmitter = (payload: {
  step: string;
  status: string;
  data?: Record<string, unknown>;
}) => void;

export type TripoJobSseEventEmitter = (event: string, data: Record<string, unknown>) => void;
