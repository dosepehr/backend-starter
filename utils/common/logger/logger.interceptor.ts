import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { AppLogger } from './logger.service';

interface RequestWithTiming extends Request {
  startTime?: number;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithTiming>();
    const requestId = request['requestId'] as string;

    const response = context.switchToHttp().getResponse<Response>();

    const { method, originalUrl } = request;
    request.startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - (request.startTime ?? Date.now());
        this.logger.log(
          `${method} ${originalUrl} → ${response.statusCode} (${duration}ms) | reqId: ${requestId}`,
          'HTTP',
        );
      }),
    );
  }
}
