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
  ): FindOptionsRelations<T> {
    return {
      ...AUDIT_RELATIONS,
      ...((options?.relations as FindOptionsRelations<T>) ?? {}),
    } as FindOptionsRelations<T>;
  }

  override find(options?: FindManyOptions<T>): Promise<T[]> {
    return super.find({
      ...options,
      relations: this.mergeRelations(options),
    });
  }

  override findOne(options: FindOneOptions<T>): Promise<T | null> {
    return super.findOne({
      ...options,
      relations: this.mergeRelations(options),
    });
  }

  override findAndCount(options?: FindManyOptions<T>): Promise<[T[], number]> {
    return super.findAndCount({
      ...options,
      relations: this.mergeRelations(options),
    });
  }
}
