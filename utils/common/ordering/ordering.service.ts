import { BadRequestException, Injectable } from '@nestjs/common';
import { FindOptionsOrder, ObjectLiteral } from 'typeorm';

@Injectable()
export class OrderingService {
  buildOrder<T extends ObjectLiteral>(
    ordering: string | undefined,
    allowedFields: readonly string[],
  ): FindOptionsOrder<T> {
    if (!ordering) return {};

    return ordering
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .reduce((acc, part) => {
        const isDesc = part.startsWith('-');
        const field = isDesc ? part.slice(1) : part;

        if (!allowedFields.includes(field)) {
          throw new BadRequestException(`Invalid ordering field: '${field}'`);
        }

        return { ...acc, [field]: isDesc ? 'DESC' : 'ASC' };
      }, {} as FindOptionsOrder<T>);
  }
}
