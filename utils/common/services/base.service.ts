import { Repository, FindOptionsWhere, ObjectLiteral } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { auditContext } from '../audit/audit.context';

export abstract class BaseService<T extends ObjectLiteral> {
  constructor(protected readonly repository: Repository<T>) {}

  async softRemove(id: number | FindOptionsWhere<T>): Promise<T> {
    const where =
      typeof id === 'number' ? ({ id } as unknown as FindOptionsWhere<T>) : id;
    const entity = await this.repository.findOne({ where });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    const ctx = auditContext.getStore();

    await this.repository
      .createQueryBuilder()
      .update()
      .set({
        deletedAt: new Date(),
        deletedBy: ctx?.userId || null,
      } as any)
      .where(where)
      .execute();

    return this.repository.findOne({
      where,
      withDeleted: true,
    }) as Promise<T>;
  }

  async recover(id: number | FindOptionsWhere<T>): Promise<T> {
    const where =
      typeof id === 'number' ? ({ id } as unknown as FindOptionsWhere<T>) : id;

    const entity = await this.repository.findOne({
      where,
      withDeleted: true,
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    if (!entity['deletedAt']) {
      throw new BadRequestException('Entity is not deleted');
    }
    const ctx = auditContext.getStore();

    await this.repository
      .createQueryBuilder()
      .update()
      .set({
        deletedAt: null,
        deletedBy: null,
        recoveredAt: new Date(),
        recoveredBy: ctx?.userId || null,
      } as any)
      .where(where)
      .execute();

    return this.repository.findOne({ where }) as Promise<T>;
  }
}
