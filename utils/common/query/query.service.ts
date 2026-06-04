import { Injectable } from '@nestjs/common';
import { FindManyOptions, ObjectLiteral, Repository } from 'typeorm';
import { FilterService } from '../filtering/filter.service';
import { SearchService } from '../searching/search.service';
import { OrderingService } from '../ordering/ordering.service';
import { PaginationService } from '../pagination/pagination.service';
import { ListQueryDto } from '../pagination/list-query.dto';
import { ListConfig } from 'utils/interfaces/list-config.interface';
import { SuccessResponse } from 'utils/interfaces/api-responses.interface';

@Injectable()
export class QueryService {
  constructor(
    private readonly filterService: FilterService,
    private readonly searchService: SearchService,
    private readonly orderingService: OrderingService,
    private readonly paginationService: PaginationService,
  ) {}

  async list<T extends ObjectLiteral>(
    repository: Repository<T>,
    query: ListQueryDto & Record<string, unknown>,
    config: ListConfig<T>,
    overrides: Omit<FindManyOptions<T>, 'where' | 'order' | 'skip' | 'take'> = {},
  ): Promise<SuccessResponse<T[]>> {
    const { where: filterWhere, withDeleted } =
      this.filterService.buildQuery<T>(query, config.filterableFields);

    const where = this.searchService.buildSearch<T>(
      query.search,
      config.searchableFields,
      filterWhere,
    );

    const order = this.orderingService.buildOrder<T>(
      query.ordering,
      config.orderableFields,
    );

    const relations = overrides.relations ?? config.defaultRelations;

    return this.paginationService.paginate(repository, query, {
      ...overrides,
      where,
      order,
      withDeleted,
      relations,
    });
  }
}
