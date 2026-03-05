import { BadRequestException, Injectable } from '@nestjs/common';
import { FindOptionsOrder } from 'typeorm';

@Injectable()
export class OrderingService {
  buildOrder<T>(
    ordering: string | undefined,
    allowedFields: string[],
  ): FindOptionsOrder<T> {
    if (!ordering) return {};

    const isDesc = ordering.startsWith('-');
    const field = isDesc ? ordering.slice(1) : ordering;

    if (!allowedFields.includes(field)) {
      throw new BadRequestException(
        `ordering field '${field}' is not allowed. Allowed fields: ${allowedFields.join(', ')}`,
      );
    }

    return {
      [field]: isDesc ? 'DESC' : 'ASC',
    } as FindOptionsOrder<T>;
  }
}
