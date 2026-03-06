import { SetMetadata } from '@nestjs/common';

export const TIMEOUT_KEY = 'request_timeout';
export const RequestTimeout = (ms: number) => SetMetadata(TIMEOUT_KEY, ms);
