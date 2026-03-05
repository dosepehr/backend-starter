import { Injectable } from '@nestjs/common';
import {
  And,
  Between,
  FindOptionsWhere,
  ILike,
  In,
  IsNull,
  LessThan,
  LessThanOrEqual,
  Like,
  MoreThan,
  MoreThanOrEqual,
  Not,
  ObjectLiteral,
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

export interface FilterResult<T extends ObjectLiteral> {
  where: FindOptionsWhere<T> | undefined;
  withDeleted: boolean;
}

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
          const suffix =
            position === 'end' ? 'T23:59:59.999Z' : 'T00:00:00.000Z';
          const date = new Date(`${value}${suffix}`);
          if (isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`);
          return date;
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
        return In(
          value.split(',').map((v) => this.parseValue(v.trim(), type)),
        );

      case '$between': {
        const parts = value.split(',');
        if (parts.length !== 2)
          throw new Error(`$between requires exactly 2 values`);

        return Between(
          this.parseValue(parts[0].trim(), type, 'start'),
          this.parseValue(parts[1].trim(), type, 'end'),
        );
      }

      case '$eq':
      default:
        return this.parseValue(value, type);
    }
  }

  private transformNullableValue(
    rawValue: string,
  ): 'isNull' | 'notNull' | undefined {
    if (rawValue === 'true') return 'notNull';
    if (rawValue === 'false') return 'isNull';
    return undefined;
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

  private resolveMultiOperator(
    fieldValue: Record<string, string>,
    type: FilterableField<any>['type'],
  ): any {
    const conditions: any[] = [];

    for (const [op, val] of Object.entries(fieldValue)) {
      if (!OPERATORS.includes(op as Operator)) continue;
      try {
        conditions.push(
          this.applyOperator(op as Operator, val as string, type),
        );
      } catch (e) {
        console.warn(`[FilterService] ${(e as Error).message}`);
      }
    }

    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];
    return And(...conditions);
  }


  buildQuery<T extends ObjectLiteral>(
    query: Record<string, any>,
    allowedFields: FilterableField<T>[],
  ): FilterResult<T> {
    const where: Record<string, any> = {};
    let withDeleted = false;

    for (const fieldMeta of allowedFields) {
      const fieldName = fieldMeta.field as string;
      const rawValue = query[fieldName];

      if (rawValue === undefined) continue;

      if (typeof rawValue === 'object' && rawValue !== null) {
        const result = this.resolveMultiOperator(rawValue, fieldMeta.type);
        if (result !== undefined) {
          where[fieldName] = result;
        }
        continue;
      }

      if (fieldMeta.nullable) {
        const nullableResult = this.transformNullableValue(rawValue);
        if (nullableResult === undefined) continue;

        if (nullableResult === 'notNull') {
          where[fieldName] = Not(IsNull());
          if (fieldName === 'deletedAt') withDeleted = true;
        } else {
          where[fieldName] = IsNull();
        }
        continue;
      }

      const value = this.transformValue(rawValue, fieldMeta.type);
      if (value !== undefined) {
        where[fieldName] = value;
      }
    }

    const hasConditions = Object.keys(where).length > 0;

    return {
      where: hasConditions ? (where as FindOptionsWhere<T>) : undefined,
      withDeleted,
    };
  }
}
