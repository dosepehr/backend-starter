import { Injectable } from '@nestjs/common';
import { AppLogger } from 'utils/common/logger/logger.service';
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

const OPERATORS = [
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
] as const;

type Operator = (typeof OPERATORS)[number];
type FieldType = FilterableField<any>['type'];

export interface FilterResult<T extends ObjectLiteral> {
  where: FindOptionsWhere<T> | undefined;
  withDeleted: boolean;
}

@Injectable()
export class FilterService {
  constructor(private readonly logger: AppLogger) {}
  private parseValue(
    value: string,
    type: FieldType,
    position?: 'start' | 'end',
  ): unknown {
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
      default:
        return value;
    }
  }

  private applyOperator(
    operator: Operator,
    value: string,
    type: FieldType,
  ): unknown {
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
        return Between(
          this.parseValue(parts[0].trim(), type, 'start'),
          this.parseValue(parts[1].trim(), type, 'end'),
        );
      }
      default:
        return this.parseValue(value, type);
    }
  }

  private resolveNullable(
    rawValue: string,
  ): 'isNull' | 'notNull' | undefined {
    if (rawValue === 'true') return 'notNull';
    if (rawValue === 'false') return 'isNull';
    return undefined;
  }

  private resolveMultiOperator(
    fieldValue: Record<string, string>,
    type: FieldType,
  ): unknown {
    const conditions: unknown[] = [];

    for (const [op, val] of Object.entries(fieldValue)) {
      if (!OPERATORS.includes(op as Operator)) continue;
      try {
        conditions.push(this.applyOperator(op as Operator, val, type));
      } catch (e) {
        this.logger.warn(`[FilterService] ${(e as Error).message}`, FilterService.name);
      }
    }

    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];
    return And(...(conditions as Parameters<typeof And>));
  }

  buildQuery<T extends ObjectLiteral>(
    query: Record<string, unknown>,
    allowedFields: readonly FilterableField<T>[],
  ): FilterResult<T> {
    const where: Record<string, unknown> = {};
    let withDeleted = false;

    for (const fieldMeta of allowedFields) {
      const fieldName = fieldMeta.field as string;
      const rawValue = query[fieldName];

      if (rawValue === undefined) continue;

      if (typeof rawValue === 'object' && rawValue !== null) {
        const result = this.resolveMultiOperator(
          rawValue as Record<string, string>,
          fieldMeta.type,
        );
        if (result !== undefined) {
          where[fieldName] = result;
        }
        continue;
      }

      if (fieldMeta.nullable) {
        const nullableResult = this.resolveNullable(rawValue as string);
        if (nullableResult === undefined) continue;

        if (nullableResult === 'notNull') {
          where[fieldName] = Not(IsNull());
          if (fieldName === 'deletedAt') withDeleted = true;
        } else {
          where[fieldName] = IsNull();
        }
        continue;
      }

      try {
        const value = this.parseValue(rawValue as string, fieldMeta.type);
        where[fieldName] = value;
      } catch (e) {
        this.logger.warn(`[FilterService] ${(e as Error).message}`, FilterService.name);
      }
    }

    const hasConditions = Object.keys(where).length > 0;

    return {
      where: hasConditions ? (where as FindOptionsWhere<T>) : undefined,
      withDeleted,
    };
  }
}
