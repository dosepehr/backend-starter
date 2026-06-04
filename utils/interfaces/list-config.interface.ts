import { FindManyOptions, ObjectLiteral } from 'typeorm';
import { FilterableField } from './filterable-field.interface';

export interface ListConfig<T extends ObjectLiteral> {
  filterableFields: readonly FilterableField<T>[];
  orderableFields: readonly Extract<keyof T, string>[];
  searchableFields: readonly Extract<keyof T, string>[];
  defaultRelations?: FindManyOptions<T>['relations'];
}
