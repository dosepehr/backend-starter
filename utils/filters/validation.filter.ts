import {
  Catch,
  ExceptionFilter,
  HttpException,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ValidationError } from 'class-validator';

interface CustomExceptionResponse {
  status: boolean;
  error: string;
  statusCode: number;
  messages: string[];
}

@Catch(HttpException)
export class ValidationFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const { error, messages } = this.parseExceptionResponse(
      exception,
      exceptionResponse,
    );

    const payload: CustomExceptionResponse = {
      status: false,
      error,
      statusCode,
      messages,
    };

    response.status(statusCode).json(payload);
  }


  private parseExceptionResponse(
    exception: HttpException,
    exceptionResponse: string | object,
  ): { error: string; messages: string[] } {
    const defaultError = this.resolveDefaultError(exception.getStatus());

    if (typeof exceptionResponse === 'string') {
      return { error: defaultError, messages: [exceptionResponse] };
    }

    const res = exceptionResponse as Record<string, any>;
    const error: string = res.error ?? defaultError;
    const messages = this.extractMessages(res.message);

    return {
      error,
      messages: messages.length > 0 ? messages : ['Operation failed'],
    };
  }

  private extractMessages(message: unknown): string[] {
    if (!message) return [];

    if (typeof message === 'string') return [message];

    if (Array.isArray(message)) {
      return message.flatMap((item: string | ValidationError) => {
        if (typeof item === 'string') return [item];
        return this.extractValidationErrorMessages(item);
      });
    }

    return [];
  }

  private extractValidationErrorMessages(error: ValidationError): string[] {
    const messages: string[] = [];

    if (error.constraints) {
      messages.push(...Object.values(error.constraints));
    } else if (error.property) {
      messages.push(`Validation failed for property: ${error.property}`);
    }

    if (error.children?.length) {
      error.children.forEach((child) => {
        messages.push(...this.extractValidationErrorMessages(child));
      });
    }

    return messages;
  }

  private resolveDefaultError(statusCode: number): string {
    return HttpStatus[statusCode] ?? 'Internal Server Error';
  }
}
