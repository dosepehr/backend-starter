import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { type Request } from 'express';

export const CurrentAccessToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (!request.accessToken) {
      throw new UnauthorizedException('No token provided');
    }
    return request.accessToken;
  },
);
