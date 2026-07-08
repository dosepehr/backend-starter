import {
  EntitySubscriberInterface,
  EventSubscriber,
  UpdateEvent,
  DataSource,
} from 'typeorm';
import { Injectable } from '@nestjs/common';
import { User } from 'src/modules/users/entities/user.entity';

// Bumps tokenVersion whenever role changes, so existing access tokens
// (which carry the old role/version) are rejected by AuthGuard instead of
// staying valid for their full 15-minute TTL after a privilege change.
@Injectable()
@EventSubscriber()
export class TokenVersionSubscriber
  implements EntitySubscriberInterface<User>
{
  constructor(dataSource: DataSource) {
    if (!dataSource.subscribers.includes(this)) {
      dataSource.subscribers.push(this);
    }
  }

  listenTo() {
    return User;
  }

  beforeUpdate(event: UpdateEvent<User>) {
    if (!event.entity) return;

    const previousRole = event.databaseEntity?.role;
    const nextRole = event.entity.role as User['role'] | undefined;

    if (nextRole === undefined || nextRole === previousRole) return;

    const previousVersion = event.databaseEntity?.tokenVersion ?? 0;
    event.entity.tokenVersion = previousVersion + 1;
  }
}
