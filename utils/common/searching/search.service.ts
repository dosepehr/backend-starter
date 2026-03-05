import { Injectable } from '@nestjs/common';
import {
  FindManyOptions,
  FindOptionsWhere,
  ILike,
  ObjectLiteral,
} from 'typeorm';

@Injectable()
export class SearchService {
  buildSearch<T extends ObjectLiteral>(
    search: string | undefined,
    allowedFields: string[],
    filterWhere?: FindOptionsWhere<T> | FindOptionsWhere<T>[],
  ): FindOptionsWhere<T> | FindOptionsWhere<T>[] | undefined {
    if (!search || !search.trim()) return filterWhere;

    const filterObj =
      filterWhere && !Array.isArray(filterWhere) ? filterWhere : {};

    return allowedFields.map((field) => ({
      ...filterObj,
      [field]: ILike(`%${search.trim()}%`),
    })) as FindOptionsWhere<T>[];
  }
}
