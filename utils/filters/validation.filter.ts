import { ExceptionFilter, Catch } from '@nestjs/common';
import { HttpException, ExecutionContext } from '@nestjs/common';
import { ValidationError } from 'class-validator';

interface ValidationExceptionResponse {
  statusCode: number;
  message: (string | ValidationError)[];
  error: string;
}

interface CustomExceptionResponse {
  status: boolean;
  error: string;
  statusCode: number;
  messages: string[];
}

@Catch(HttpException)
export class ValidationFilter<TException extends HttpException | object> implements ExceptionFilter {
  catch(exception: TException, host: ExecutionContext) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    
    let httpException: HttpException;
    let statusCode: number;
    let exceptionResponse: any;
    let customResponse!: CustomExceptionResponse;

    if (exception instanceof HttpException) {
      httpException = exception;
    } else {
      httpException = new HttpException('Internal Server Error', 500);
    }

    statusCode = httpException.getStatus();
    exceptionResponse = httpException.getResponse();
    
    if (statusCode === 400 && typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
      const validationResponse = exceptionResponse as ValidationExceptionResponse;
      let allErrorStrings: string[] = [];

      validationResponse.message.forEach((msgItem) => {
        if (typeof msgItem === 'string') {
          allErrorStrings.push(msgItem);
        } else if (typeof msgItem === 'object' && msgItem !== null && msgItem.constraints) {
          Object.values(msgItem.constraints).forEach(constraintError => {
            allErrorStrings.push(constraintError);
          });
        } else if (typeof msgItem === 'object' && msgItem !== null && 'property' in msgItem) {
             allErrorStrings.push(`Validation failed for property: ${msgItem.property}`);
        }
      });
      
      const finalMessages = allErrorStrings.length > 0 
        ? allErrorStrings 
        : [typeof validationResponse.message === 'string' 
              ? validationResponse.message 
              : 'Validation failed.'];

      customResponse = {
        status: false,
        error: validationResponse.error || 'Bad Request',
        statusCode: statusCode,
        messages: finalMessages as string[],
      };

    } else {
      let messageToSend: string[];
      
      if (typeof exceptionResponse === 'string') {
          messageToSend = [exceptionResponse];
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null && 'message' in exceptionResponse) {
          const msg = exceptionResponse.message;
          messageToSend = Array.isArray(msg) 
            ? msg.filter(m => typeof m === 'string')
            : [String(msg)];
      } else {
          messageToSend = ['Operation failed.'];
      }

      customResponse = {
        status: false,
        error: (exceptionResponse as any).error || httpException.name,
        statusCode: statusCode,
        messages: messageToSend,
      };
    }
    
    response.status(customResponse.statusCode).json(customResponse);
  }
}
