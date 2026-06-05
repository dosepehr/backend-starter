import { Injectable } from '@nestjs/common';
import { FindOptionsWhere, ILike, ObjectLiteral } from 'typeorm';

@Injectable()
export class SearchService {
  buildSearch<T extends ObjectLiteral>(
    search: string | undefined,
    allowedFields: readonly string[],
    filterWhere?: FindOptionsWhere<T> | FindOptionsWhere<T>[],
  ): FindOptionsWhere<T> | FindOptionsWhere<T>[] | undefined {
    if (!search?.trim()) return filterWhere;

    // Flatten filter: if it's already an OR-array, each branch must carry the
    // search condition; if it's a single object (or absent), spread it into each branch.
    const filterBranches: FindOptionsWhere<T>[] = Array.isArray(filterWhere)
      ? filterWhere
      : filterWhere
        ? [filterWhere]
        : [{}];

    return filterBranches.flatMap((branch) =>
      allowedFields.map((field) => ({
        ...branch,
        [field]: ILike(`%${search.trim()}%`),
      })),
    ) as FindOptionsWhere<T>[];
  }
}
