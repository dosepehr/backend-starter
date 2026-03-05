import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';
import { SuccessResponse } from 'utils/interfaces/api-responses.interface';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  SuccessResponse<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponse<T>> {
    const message = this.reflector.get<string>(
      RESPONSE_MESSAGE_KEY,
      context.getHandler(),
    );

    return next.handle().pipe(
      map((response) => {
        // of it is already formatted
        if (
          response !== null &&
          typeof response === 'object' &&
          'status' in response
        ) {
          return response as SuccessResponse<T>;
        }

        return {
          status: true,
          ...(message && { message }),
          ...(response !== undefined &&
            response !== null && { data: response }),
        } satisfies SuccessResponse<T>;
      }),
    );
  }
}
