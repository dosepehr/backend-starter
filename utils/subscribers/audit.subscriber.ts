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
import { User } from 'src/modules/users/entities/user.entity';

@Injectable()
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  beforeInsert(event: InsertEvent<GlobalEntity>) {
    if (!(event.entity instanceof GlobalEntity)) return;
    const ctx = auditContext.getStore();
    if (!ctx?.userId) return;

    event.entity.createdByUser = { id: ctx.userId } as User;
    event.entity.updatedByUser = { id: ctx.userId } as User;
  }

  beforeUpdate(event: UpdateEvent<GlobalEntity>) {
    if (!(event.entity instanceof GlobalEntity)) return;
    const ctx = auditContext.getStore();
    if (!ctx?.userId || !event.entity) return;

    event.entity.updatedByUser = { id: ctx.userId } as User;
  }

  afterSoftRemove(event: SoftRemoveEvent<GlobalEntity>) {
    if (!(event.entity instanceof GlobalEntity)) return;
    const ctx = auditContext.getStore();
    if (!ctx?.userId || !event.entity?.id) return;

    event.manager
      .createQueryBuilder()
      .update(event.metadata.target)
      .set({ deletedByUser: { id: ctx.userId } })
      .where('id = :id', { id: event.entity.id })
      .execute();
  }

  afterRecover(event: RecoverEvent<GlobalEntity>) {
    if (!(event.entity instanceof GlobalEntity)) return;
    const ctx = auditContext.getStore();
    if (!ctx?.userId || !event.entity?.id) return;

    event.manager
      .createQueryBuilder()
      .update(event.metadata.target)
      .set({ recoveredByUser: { id: ctx.userId }, recoveredAt: new Date() })
      .where('id = :id', { id: event.entity.id })
      .execute();
  }
}
