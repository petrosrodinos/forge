// Shared global types

export type ID = string | number;

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type WithId<T> = T & { id: ID };
