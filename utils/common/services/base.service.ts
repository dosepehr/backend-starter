import { Repository, FindOptionsWhere, FindManyOptions } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { auditContext } from '../audit/audit.context';
import { GlobalEntity } from 'utils/global/global.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { QueryService } from '../query/query.service';
import { ListConfig } from 'utils/interfaces/list-config.interface';
import { ListQueryDto } from '../pagination/list-query.dto';
import { SuccessResponse } from 'utils/interfaces/api-responses.interface';

type UserRef = Pick<User, 'id'>;

export abstract class BaseService<T extends GlobalEntity> {
  constructor(
    protected readonly repository: Repository<T>,
    protected readonly queryService: QueryService,
  ) {}

  findAll(
    query: ListQueryDto & Record<string, unknown>,
    config: ListConfig<T>,
    overrides: Omit<
      FindManyOptions<T>,
      'where' | 'order' | 'skip' | 'take'
    > = {},
  ): Promise<SuccessResponse<T[]>> {
    return this.queryService.list(this.repository, query, config, overrides);
  }

  async softRemove(id: number | FindOptionsWhere<T>): Promise<T> {
    const where =
      typeof id === 'number' ? ({ id } as unknown as FindOptionsWhere<T>) : id;

    const entity = await this.repository.findOne({ where });
    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    const ctx = auditContext.getStore();
    if (ctx?.userId) {
      entity.deletedByUser = { id: ctx.userId } as UserRef as User;
    }

    await this.repository.softRemove(entity);

    return this.repository.findOne({ where, withDeleted: true }) as Promise<T>;
  }

  async recover(id: number | FindOptionsWhere<T>): Promise<T> {
    const where =
      typeof id === 'number' ? ({ id } as unknown as FindOptionsWhere<T>) : id;

    const entity = await this.repository.findOne({ where, withDeleted: true });
    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    if (!entity.deletedAt) {
      throw new BadRequestException('Entity is not deleted');
    }

    const ctx = auditContext.getStore();
    if (ctx?.userId) {
      entity.recoveredByUser = { id: ctx.userId } as UserRef as User;
    }
    entity.recoveredAt = new Date();
    entity.deletedByUser = null;

    await this.repository.recover(entity);
    await this.repository.save(entity);

    return this.repository.findOne({ where }) as Promise<T>;
  }
}
