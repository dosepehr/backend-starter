import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiQuery,
  getSchemaPath,
} from '@nestjs/swagger';

export function ApiPaginated<T>(model: Type<T>) {
  return applyDecorators(
    ApiExtraModels(model),

    ApiOkResponse({
      description: 'Paginated response',
      schema: {
        properties: {
          status: { type: 'boolean', example: true },
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(model) },
          },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'number', example: 1 },
              limit: { type: 'number', example: 10 },
              total: { type: 'number', example: 100 },
              totalPages: { type: 'number', example: 10 },
              hasNextPage: { type: 'boolean', example: true },
              hasPrevPage: { type: 'boolean', example: false },
            },
          },
        },
      },
    }),

    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, example: 10 }),
    ApiQuery({
      name: 'ordering',
      required: false,
      type: String,
      example: '-createdAt',
      description:
        'Sort by field name. Prefix with `-` for descending order. Example: `createdAt` (ascending), `-createdAt` (descending)',
    }),
    ApiQuery({
      name: 'search',
      required: false,
      type: String,
      description: 'Search term to filter results across searchable fields',
      example: 'search',
    }),
  );
}
