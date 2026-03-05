// src/utils/decorators/api-response.decorator.ts
import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { ResponseMessage } from './response-message.decorator';

// Use for endpoints that return a data object.
export function DocsResponse<T>(message: string, model: Type<T>) {
  return applyDecorators(
    ResponseMessage(message),
    ApiExtraModels(model),
    ApiOkResponse({
      description: message,
      schema: {
        properties: {
          status: { type: 'boolean', example: true },
          message: { type: 'string', example: message },
          data: { $ref: getSchemaPath(model) },
        },
      },
    }),
  );
}

// Use for endpoints that return null (e.g. delete, soft-delete, recover).
export function DocsResponseNull(message: string) {
  return applyDecorators(
    ResponseMessage(message),
    ApiOkResponse({
      description: message,
      schema: {
        properties: {
          status: { type: 'boolean', example: true },
          message: { type: 'string', example: message },
          data: { type: 'object', nullable: true, example: null },
        },
      },
    }),
  );
}
