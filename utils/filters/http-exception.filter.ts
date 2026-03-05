import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
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
        message = resp.message ?? message;

        if (Array.isArray(resp.message)) {
          message = 'Validation failed';
          errors = this.formatValidationErrors(resp.message as string[]);
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
        ? `${method} ${originalUrl} → ${status} (${duration}) | ${message}\n${exception.stack}`
        : `${method} ${originalUrl} → ${status} (${duration}) | ${message}`;

    this.logger.error(logMessage, undefined, 'HTTP');

    const errorResponse: ErrorResponse = {
      status: false,
      message,
      ...(errors && { errors }),
    };

    response.status(status).json(errorResponse);
  }

  private formatValidationErrors(
    messages: string[],
  ): Record<string, string[]> {
    return messages.reduce(
      (acc, msg) => {
        const field = msg.split(' ')[0];
        if (!acc[field]) acc[field] = [];
        acc[field].push(msg);
        return acc;
      },
      {} as Record<string, string[]>,
    );
  }
}
