import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiCreatedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ResponseMessage } from './response-message.decorator';

export function DocsResponse<T>(
  message: string,
  model?: Type<T>,
  options?: {
    status?: 200 | 201;
    isArray?: boolean;
  },
) {
  const status = options?.status ?? 200;
  const isArray = options?.isArray ?? false;

  const dataSchema = model
    ? isArray
      ? {
          type: 'array',
          items: { $ref: getSchemaPath(model) },
        }
      : { $ref: getSchemaPath(model) }
    : { type: 'object', nullable: true, example: null };

  const ResponseDecorator = status === 201 ? ApiCreatedResponse : ApiOkResponse;

  return applyDecorators(
    ResponseMessage(message),
    ...(model ? [ApiExtraModels(model)] : []),
    ResponseDecorator({
      description: message,
      type: 'object',
      schema: {
        properties: {
          status: { type: 'boolean', example: true },
          message: { type: 'string', example: message },
          data: dataSchema,
        },
      },
    }),
  );
}
