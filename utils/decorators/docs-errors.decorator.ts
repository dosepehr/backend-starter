import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiConflictResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';

const ValidationErrorSchema = (description: string) => ({
  description,
  schema: {
    properties: {
      status: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Validation failed' },
      errors: {
        type: 'object',
        additionalProperties: { type: 'array', items: { type: 'string' } },
        example: { field: ['field must not be empty'] },
      },
    },
  },
});

const SimpleErrorSchema = (description: string, messageExample: string) => ({
  description,
  schema: {
    properties: {
      status: { type: 'boolean', example: false },
      message: { type: 'string', example: messageExample },
    },
  },
});

export type DocsErrorCode = 400 | 401 | 403 | 404 | 409 | 429;

type ErrorEntry =
  | { code: 400; description?: string }
  | { code: 401; description?: string }
  | { code: 403; description?: string }
  | { code: 404; description?: string }
  | { code: 409; description?: string }
  | { code: 429; description?: string };

function makeDecorator(entry: ErrorEntry): MethodDecorator {
  const desc = entry.description;

  switch (entry.code) {
    case 400:
      return ApiBadRequestResponse(
        ValidationErrorSchema(desc ?? 'Validation failed'),
      );
    case 401:
      return ApiUnauthorizedResponse(
        SimpleErrorSchema(desc ?? 'Unauthorized', 'Unauthorized'),
      );
    case 403:
      return ApiForbiddenResponse(
        SimpleErrorSchema(desc ?? 'Forbidden', 'Forbidden resource'),
      );
    case 404:
      return ApiNotFoundResponse(
        SimpleErrorSchema(desc ?? 'Resource not found', desc ?? 'Resource not found'),
      );
    case 409:
      return ApiConflictResponse(
        SimpleErrorSchema(desc ?? 'Conflict', desc ?? 'Record already exists'),
      );
    case 429:
      return ApiTooManyRequestsResponse(
        SimpleErrorSchema(
          desc ?? 'Too many requests',
          desc ?? 'Too many requests. Please try again later.',
        ),
      );
  }
}

export function DocsErrors(
  ...entries: (DocsErrorCode | ErrorEntry)[]
): MethodDecorator & ClassDecorator {
  const normalized: ErrorEntry[] = entries.map((e) =>
    typeof e === 'number' ? { code: e } : e,
  );
  return applyDecorators(...normalized.map(makeDecorator));
}
