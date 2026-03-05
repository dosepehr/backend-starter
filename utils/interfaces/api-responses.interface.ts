import { PaginationMeta } from './pagination-meta.interface';

export interface SuccessResponse<T = undefined> {
  status: boolean;
  message?: string;
  data?: T;
  meta?: PaginationMeta;
}
