import { Injectable } from '@nestjs/common';
import {
  FindManyOptions,
  IsNull,
  Not,
  Like,
  Between,
  In,
  MoreThanOrEqual,
  LessThanOrEqual,
  MoreThan,
  LessThan,
} from 'typeorm';
import { FilterableField } from '../../interfaces/filterable-field.interface';

type Operator =
  | '$eq'
  | '$like'
  | '$gte'
  | '$lte'
  | '$gt'
  | '$lt'
  | '$in'
  | '$between';

@Injectable()
export class FilterService {
  private applyOperator(operator: Operator, value: string): any {
    switch (operator) {
      case '$like':
        return Like(`%${value}%`);

      case '$gte':
        return MoreThanOrEqual(this.parseNumber(value));

      case '$lte':
        return LessThanOrEqual(this.parseNumber(value));

      case '$gt':
        return MoreThan(this.parseNumber(value));

      case '$lt':
        return LessThan(this.parseNumber(value));

      case '$in':
        return In(value.split(','));

      case '$between': {
        const [min, max] = value.split(',').map(Number);
        return Between(min, max);
      }

      case '$eq':
      default:
        return value;
    }
  }

  private parseNumber(value: string): number {
    const num = Number(value);
    if (isNaN(num)) throw new Error(`Invalid number: ${value}`);
    return num;
  }

  private transformValue(
    value: string,
    type: FilterableField<any>['type'],
  ): any {
    switch (type) {
      case 'boolean':
        if (value === 'true') return true;
        if (value === 'false') return false;
        return undefined;

      case 'number':
        const num = Number(value);
        return isNaN(num) ? undefined : num;

      case 'date':
        const date = new Date(value);
        return isNaN(date.getTime()) ? undefined : date;

      case 'string':
      default:
        return value;
    }
  }

  buildQuery<T>(
    query: Record<string, string>,
    allowedFields: FilterableField<T>[],
  ): FindManyOptions<T> {
    const where: Record<string, any> = {};
    let withDeleted = false;

    for (const fieldMeta of allowedFields) {
      const fieldName = fieldMeta.field as string;

      const operatorKey = Object.keys(query).find(
        (k) =>
          k === `${fieldName}[$gte]` ||
          k === `${fieldName}[$lte]` ||
          k === `${fieldName}[$gt]` ||
          k === `${fieldName}[$lt]` ||
          k === `${fieldName}[$like]` ||
          k === `${fieldName}[$in]` ||
          k === `${fieldName}[$between]`,
      );

      if (operatorKey) {
        const match = operatorKey.match(/\[(.+)\]/);
        if (match) {
          const operator = match[1] as Operator;
          where[fieldName] = this.applyOperator(operator, query[operatorKey]);
        }
        continue;
      }

      const rawValue = query[fieldName];
      if (rawValue === undefined) continue;

      if (fieldMeta.type === 'boolean' && fieldMeta.nullable) {
        const value = this.transformValue(rawValue, 'boolean');
        if (value === undefined) continue;

        where[fieldName] = value ? Not(IsNull()) : IsNull();

        if (fieldName === 'deletedAt' && value === true) {
          withDeleted = true;
        }
        continue;
      }

      const value = this.transformValue(rawValue, fieldMeta.type);
      if (value !== undefined) {
        where[fieldName] = value;
      }
    }

    return { where: where as any, withDeleted };
  }
}
