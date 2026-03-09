import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  SoftRemoveEvent,
  RecoverEvent,
  DataSource,
} from 'typeorm';
import { Injectable } from '@nestjs/common';
import { auditContext } from 'utils/context/audit.context';
import { GlobalEntity } from 'utils/global/global.entity';

@Injectable()
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface<GlobalEntity> {
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return GlobalEntity;
  }

  beforeInsert(event: InsertEvent<GlobalEntity>) {
    const ctx = auditContext.getStore();
    if (!ctx?.userId) return;

    event.entity.createdBy = ctx.userId;
    event.entity.updatedBy = ctx.userId;
  }

  beforeUpdate(event: UpdateEvent<GlobalEntity>) {
    const ctx = auditContext.getStore();
    if (!ctx?.userId || !event.entity) return;

    event.entity.updatedBy = ctx.userId;
  }

  afterSoftRemove(event: SoftRemoveEvent<GlobalEntity>) {
    const ctx = auditContext.getStore();
    if (!ctx?.userId || !event.entity?.id) return;

    event.manager
      .createQueryBuilder()
      .update(event.metadata.target)
      .set({ deletedBy: ctx.userId })
      .where('id = :id', { id: event.entity.id })
      .execute();
  }

  afterRecover(event: RecoverEvent<GlobalEntity>) {
    const ctx = auditContext.getStore();
    if (!ctx?.userId || !event.entity?.id) return;

    event.manager
      .createQueryBuilder()
      .update(event.metadata.target)
      .set({ recoveredBy: ctx.userId, recoveredAt: new Date() })
      .where('id = :id', { id: event.entity.id })
      .execute();
  }
}
