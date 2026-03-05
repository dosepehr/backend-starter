import { Injectable } from '@nestjs/common';
import {
  FindManyOptions,
  IsNull,
  Not,
  Like,
  ILike,
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
  | '$ne'
  | '$like'
  | '$ilike'
  | '$gte'
  | '$lte'
  | '$gt'
  | '$lt'
  | '$in'
  | '$between';

const OPERATORS: Operator[] = [
  '$eq',
  '$ne',
  '$like',
  '$ilike',
  '$gte',
  '$lte',
  '$gt',
  '$lt',
  '$in',
  '$between',
];

@Injectable()
export class FilterService {
  private parseValue(
    value: string,
    type: FilterableField<any>['type'],
    position?: 'start' | 'end',
  ): any {
    switch (type) {
      case 'date': {
        const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value.trim());

        if (isDateOnly) {
          if (position === 'end') {
            const date = new Date(`${value}T23:59:59.999Z`);
            if (isNaN(date.getTime()))
              throw new Error(`Invalid date: ${value}`);
            return date;
          } else {
            const date = new Date(`${value}T00:00:00.000Z`);
            if (isNaN(date.getTime()))
              throw new Error(`Invalid date: ${value}`);
            return date;
          }
        }

        const date = new Date(value);
        if (isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`);
        return date;
      }

      case 'number': {
        const num = Number(value);
        if (isNaN(num)) throw new Error(`Invalid number: ${value}`);
        return num;
      }

      case 'boolean':
        if (value === 'true') return true;
        if (value === 'false') return false;
        throw new Error(`Invalid boolean: ${value}`);

      case 'string':
      default:
        return value;
    }
  }

  private applyOperator(
    operator: Operator,
    value: string,
    type: FilterableField<any>['type'],
  ): any {
    switch (operator) {
      case '$ne':
        return Not(this.parseValue(value, type));

      case '$like':
        return Like(`%${value}%`);

      case '$ilike':
        return ILike(`%${value}%`);

      case '$gte':
        return MoreThanOrEqual(this.parseValue(value, type));

      case '$lte':
        return LessThanOrEqual(this.parseValue(value, type));

      case '$gt':
        return MoreThan(this.parseValue(value, type));

      case '$lt':
        return LessThan(this.parseValue(value, type));

      case '$in':
        return In(value.split(',').map((v) => this.parseValue(v.trim(), type)));

      case '$between': {
        const parts = value.split(',');
        if (parts.length !== 2)
          throw new Error(`$between requires exactly 2 values`);

        const min = this.parseValue(parts[0].trim(), type, 'start');
        const max = this.parseValue(parts[1].trim(), type, 'end');

        return Between(min, max);
      }

      case '$eq':
      default:
        return this.parseValue(value, type);
    }
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

      case 'number': {
        const num = Number(value);
        return isNaN(num) ? undefined : num;
      }

      case 'date': {
        const date = new Date(value);
        return isNaN(date.getTime()) ? undefined : date;
      }

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

      const operatorKey = Object.keys(query).find((k) =>
        OPERATORS.some((op) => k === `${fieldName}[${op}]`),
      );

      if (operatorKey) {
        const match = operatorKey.match(/\[(.+)\]/);
        if (match) {
          const operator = match[1] as Operator;
          try {
            where[fieldName] = this.applyOperator(
              operator,
              query[operatorKey],
              fieldMeta.type,
            );
          } catch (e) {
            console.warn(`[FilterService] ${e.message}`);
          }
        }
        continue;
      }

      const rawValue = query[fieldName];
      if (rawValue === undefined) continue;

      if (fieldMeta.nullable) {
        const boolValue = this.transformValue(rawValue, 'boolean');
        if (boolValue === undefined) continue;

        where[fieldName] = boolValue ? Not(IsNull()) : IsNull();

        if (fieldName === 'deletedAt' && boolValue === true) {
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
