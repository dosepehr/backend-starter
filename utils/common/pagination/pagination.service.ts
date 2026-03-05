import { Injectable } from '@nestjs/common';
import { FindManyOptions, ObjectLiteral, Repository } from 'typeorm';
import { PaginationDto } from './pagination.dto';
import { SuccessResponse } from 'utils/interfaces/api-responses.interface';
import { PaginationMeta } from 'utils/interfaces/pagination-meta.interface';

@Injectable()
export class PaginationService {
  async paginate<T extends ObjectLiteral>(
    repository: Repository<T>,
    paginationDto: PaginationDto,
    options: FindManyOptions<T> = {},
  ): Promise<SuccessResponse<T[]>> {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await repository.findAndCount({
      ...options,
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    const meta: PaginationMeta = {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return {
      status: true,
      data,
      meta,
    };
  }
}
