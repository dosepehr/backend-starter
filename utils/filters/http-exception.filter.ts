import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Request, Response } from 'express';
import { ErrorResponse } from 'utils/interfaces/api-responses.interface';
import { AppLogger } from 'utils/common/logger/logger.service';

interface MysqlDriverError {
  code?: string;
  sqlMessage?: string;
}

// Maps common MySQL driver error codes to a clean HTTP status + message,
// so a raw QueryFailedError never leaks driver internals as a bare 500.
const MYSQL_ERROR_MAP: Record<string, { status: HttpStatus; message: string }> = {
  ER_DUP_ENTRY: {
    status: HttpStatus.CONFLICT,
    message: 'Resource already exists',
  },
  ER_ROW_IS_REFERENCED_2: {
    status: HttpStatus.CONFLICT,
    message: 'Resource is referenced by other records',
  },
  ER_NO_REFERENCED_ROW_2: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Referenced resource does not exist',
  },
  ER_DATA_TOO_LONG: {
    status: HttpStatus.BAD_REQUEST,
    message: 'One or more fields exceed the allowed length',
  },
};

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
    } else if (exception instanceof QueryFailedError) {
      const mapped = this.mapDatabaseError(exception);
      status = mapped.status;
      message = mapped.message;
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

  private mapDatabaseError(
    exception: QueryFailedError,
  ): { status: HttpStatus; message: string } {
    const driverError = exception.driverError as MysqlDriverError | undefined;
    const mapped = driverError?.code ? MYSQL_ERROR_MAP[driverError.code] : undefined;

    return (
      mapped ?? {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      }
    );
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
