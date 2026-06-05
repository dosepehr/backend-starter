import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { instanceToPlain } from 'class-transformer';
import { Observable, map } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';
import { SuccessResponse } from 'utils/interfaces/api-responses.interface';

function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') {
    return instanceToPlain(value, { excludeExtraneousValues: true });
  }
  return value;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<SuccessResponse<T>> {
    const message = this.reflector.get<string>(
      RESPONSE_MESSAGE_KEY,
      context.getHandler(),
    );

    return next.handle().pipe(
      map((response) => {
        // Already a fully-formed response (e.g. from PaginationService)
        if (
          response !== null &&
          typeof response === 'object' &&
          'status' in response
        ) {
          if ('data' in response) {
            return { ...response, data: serialize(response.data) as T } as SuccessResponse<T>;
          }
          return response as SuccessResponse<T>;
        }

        return {
          status: true,
          ...(message && { message }),
          ...(response !== undefined && response !== null && {
            data: serialize(response) as T,
          }),
        } satisfies SuccessResponse<T>;
      }),
    );
  }
}
