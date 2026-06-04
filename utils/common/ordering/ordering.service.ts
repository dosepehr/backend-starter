import { BadRequestException, Injectable } from '@nestjs/common';
import { FindOptionsOrder, ObjectLiteral } from 'typeorm';

@Injectable()
export class OrderingService {
  buildOrder<T extends ObjectLiteral>(
    ordering: string | undefined,
    allowedFields: readonly string[],
  ): FindOptionsOrder<T> {
    if (!ordering) return {};

    const isDesc = ordering.startsWith('-');
    const field = isDesc ? ordering.slice(1) : ordering;

    if (!allowedFields.includes(field)) {
      throw new BadRequestException(
        `Invalid ordering field: '${field}'`,
      );
    }

    return { [field]: isDesc ? 'DESC' : 'ASC' } as FindOptionsOrder<T>;
  }
}
