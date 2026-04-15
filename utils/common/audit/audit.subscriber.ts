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
import { auditContext } from 'utils/common/audit/audit.context';
import { GlobalEntity } from 'utils/global/global.entity';
import { User } from 'src/modules/users/entities/user.entity';

function isGlobalEntity(entity: unknown): entity is GlobalEntity {
  return (
    typeof entity === 'object' &&
    entity !== null &&
    'createdByUser' in entity &&
    'updatedByUser' in entity
  );
}

@Injectable()
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  constructor(dataSource: DataSource) {
    if (!dataSource.subscribers.includes(this)) {
      dataSource.subscribers.push(this);
    }
  }

  beforeInsert(event: InsertEvent<unknown>) {
    if (!isGlobalEntity(event.entity)) return;
    const ctx = auditContext.getStore();
    if (!ctx?.userId) return;

    event.entity.createdByUser = { id: ctx.userId } as User;
    event.entity.updatedByUser = { id: ctx.userId } as User;
  }

  beforeUpdate(event: UpdateEvent<unknown>) {
    if (!isGlobalEntity(event.entity)) return;
    const ctx = auditContext.getStore();
    if (!ctx?.userId) return;

    event.entity.updatedByUser = { id: ctx.userId } as User;
  }

  beforeSoftRemove(event: SoftRemoveEvent<unknown>) {
    if (!isGlobalEntity(event.entity)) return;
    const ctx = auditContext.getStore();
    if (!ctx?.userId) return;

    event.entity.deletedByUser = { id: ctx.userId } as User;
  }

  beforeRecover(event: RecoverEvent<unknown>) {
    if (!isGlobalEntity(event.entity)) return;
    const ctx = auditContext.getStore();
    if (!ctx?.userId) return;

    event.entity.recoveredByUser = { id: ctx.userId } as User;
    event.entity.recoveredAt = new Date();
  }
}
