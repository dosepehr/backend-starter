import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const throttlerConfig: ThrottlerModuleOptions = {
  throttlers: [
    {
      name: 'short',
      ttl: 1000, // 1 s
      limit: 10, // 10 requests
    },
    {
      name: 'long',
      ttl: 60000,
      limit: 100,
    },
  ],
};
