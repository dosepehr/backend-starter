import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponse } from 'utils/interfaces/api-responses.interface';
import { AppLogger } from 'utils/common/logger/logger.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = request['requestId'] as string | undefined;

    // Handle Terminus HealthCheckError separately to strip internal details
    if (this.isHealthCheckError(exception)) {
      const exceptionResponse = (
        exception as HttpException
      ).getResponse() as Record<string, any>;
      const { details, ...cleaned } = exceptionResponse;
      return void response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        ...cleaned,
        ...(requestId && { requestId }),
      });
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, any>;

        if (resp.errors && typeof resp.errors === 'object') {
          // Structured validation errors coming from exceptionFactory
          message =
            typeof resp.message === 'string'
              ? resp.message
              : 'Validation failed';
          errors = resp.errors as Record<string, string[]>;
        } else if (Array.isArray(resp.message)) {
          // Fallback: parse flat message array if exceptionFactory is not configured
          message = 'Validation failed';
          errors = this.formatValidationErrors(resp.message as string[]);
        } else {
          message = typeof resp.message === 'string' ? resp.message : message;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const startTime = (request as any).startTime as number | undefined;
    const duration = startTime ? `${Date.now() - startTime}ms` : '-';
    const { method, originalUrl } = request;

    const logMessage =
      exception instanceof Error && status >= 500
        ? `${method} ${originalUrl} → ${status} (${duration}) | reqId: ${requestId ?? '-'} | ${message}\n${exception.stack}`
        : `${method} ${originalUrl} → ${status} (${duration}) | reqId: ${requestId ?? '-'} | ${message}`;

    this.logger.error(logMessage, undefined, 'HTTP');

    const errorResponse: ErrorResponse = {
      status: false,
      message,
      ...(errors && { errors }),
      ...(requestId && { requestId }),
    };

    response.status(status).json(errorResponse);
  }

  private isHealthCheckError(exception: unknown): boolean {
    if (!(exception instanceof ServiceUnavailableException)) return false;

    const body = exception.getResponse();
    return (
      typeof body === 'object' &&
      body !== null &&
      'status' in body &&
      'info' in body &&
      'error' in body
    );
  }

  // Fallback parser: groups flat validation messages by field name (first word)
  private formatValidationErrors(messages: string[]): Record<string, string[]> {
    return messages.reduce(
      (acc, msg) => {
        const field = msg.split(' ')[0].toLowerCase();
        if (!acc[field]) acc[field] = [];
        acc[field].push(msg);
        return acc;
      },
      {} as Record<string, string[]>,
    );
  }
}
