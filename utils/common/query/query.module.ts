import { Global, Module } from '@nestjs/common';
import { FilterService } from '../filtering/filter.service';
import { SearchService } from '../searching/search.service';
import { OrderingService } from '../ordering/ordering.service';
import { PaginationService } from '../pagination/pagination.service';
import { QueryService } from './query.service';

@Global()
@Module({
  providers: [
    FilterService,
    SearchService,
    OrderingService,
    PaginationService,
    QueryService,
  ],
  exports: [
    FilterService,
    SearchService,
    OrderingService,
    PaginationService,
    QueryService,
  ],
})
export class QueryModule {}
