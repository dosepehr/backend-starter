import { PaginationMeta } from './pagination-meta.interface';

export interface SuccessResponse<T = undefined> {
  status: boolean;
  message?: string;
  data?: T;
  meta?: PaginationMeta;
}

export interface ErrorResponse {
  status: false;
  message: string;
  errors?: Record<string, string[]>;
}
