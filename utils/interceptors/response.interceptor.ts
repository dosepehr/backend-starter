import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { SuccessResponse } from 'utils/interfaces/api-responses.interface';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, SuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((response) => {
        // if it is formatted from service
        if (
          response !== null &&
          typeof response === 'object' &&
          'status' in response
        ) {
          return response as SuccessResponse<T>;
        }

        return {
          status: true,
          data: response,
        } satisfies SuccessResponse<T>;
      }),
    );
  }
}
