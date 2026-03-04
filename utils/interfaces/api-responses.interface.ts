export interface SuccessResponse<T = undefined> {
  status: boolean;
  message?: string;
  data?: T;
}
