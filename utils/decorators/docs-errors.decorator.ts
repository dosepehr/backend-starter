import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiConflictResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';

// 401, 403, 404, 409, 429
const SimpleErrorSchema = (messageExample: string) => ({
  schema: {
    properties: {
      status: { type: 'boolean', example: false },
      message: { type: 'string', example: messageExample },
    },
  },
});

// 400
const ValidationErrorSchema = () => ({
  schema: {
    properties: {
      status: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Validation failed' },
      errors: {
        type: 'object',
        example: {
          age: [
            'age must be a number conforming to the specified constraints',
            'age should not be empty',
          ],
          firstName: ['firstName must be a string'],
        },
        additionalProperties: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  },
});

type ErrorCode = 400 | 401 | 403 | 404 | 409 | 429;

const errorDecorators: Record<ErrorCode, MethodDecorator> = {
  400: ApiBadRequestResponse({
    description: 'Validation failed',
    ...ValidationErrorSchema(),
  }),

  401: ApiUnauthorizedResponse({
    description: 'Unauthorized',
    ...SimpleErrorSchema('Unauthorized'),
  }),

  403: ApiForbiddenResponse({
    description: 'Forbidden',
    ...SimpleErrorSchema('Forbidden resource'),
  }),

  404: ApiNotFoundResponse({
    description: 'Resource not found',
    ...SimpleErrorSchema('Resource not found'),
  }),

  409: ApiConflictResponse({
    description: 'Conflict',
    ...SimpleErrorSchema('Record already exists'),
  }),

  429: ApiTooManyRequestsResponse({
    description: 'Too many requests',
    ...SimpleErrorSchema('Too many requests. Please try again later.'),
  }),
};

export type DocsErrorCode = ErrorCode;

export function DocsErrors(...codes: ErrorCode[]) {
  return applyDecorators(...codes.map((code) => errorDecorators[code]));
}
