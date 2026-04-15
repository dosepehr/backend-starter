import { NotFoundException } from '@nestjs/common';
import {
  Repository,
  FindManyOptions,
  FindOneOptions,
  DataSource,
  EntityTarget,
  ObjectLiteral,
  FindOptionsRelations,
} from 'typeorm';

const AUDIT_RELATIONS = {
  createdByUser: true,
  updatedByUser: true,
  deletedByUser: true,
  recoveredByUser: true,
};

export class GlobalRepository<T extends ObjectLiteral> extends Repository<T> {
  constructor(target: EntityTarget<T>, dataSource: DataSource) {
    super(target, dataSource.manager);
  }

  private mergeRelations(
    options?: FindManyOptions<T> | FindOneOptions<T>,
    withAudit = true,
  ): FindOptionsRelations<T> {
    const base = withAudit ? AUDIT_RELATIONS : {};
    return {
      ...base,
      ...((options?.relations as FindOptionsRelations<T>) ?? {}),
    } as FindOptionsRelations<T>;
  }

  override find(
    options?: FindManyOptions<T> & { withAudit?: boolean },
  ): Promise<T[]> {
    const { withAudit = true, ...rest } = options ?? {};
    return super.find({
      ...rest,
      relations: this.mergeRelations(rest, withAudit),
    });
  }

  override findOne(
    options: FindOneOptions<T> & { withAudit?: boolean },
  ): Promise<T | null> {
    const { withAudit = true, ...rest } = options;
    return super.findOne({
      ...rest,
      relations: this.mergeRelations(rest, withAudit),
    });
  }

  override findAndCount(
    options?: FindManyOptions<T> & { withAudit?: boolean },
  ): Promise<[T[], number]> {
    const { withAudit = true, ...rest } = options ?? {};
    return super.findAndCount({
      ...rest,
      relations: this.mergeRelations(rest, withAudit),
    });
  }
  async safeRecover(id: number): Promise<T> {
    const entity = await this.findOne({
      where: { id } as any,
      withDeleted: true,
      withAudit: false,
    });

    if (!entity) throw new NotFoundException('Entity not found');

    return this.recover(entity);
  }
}
