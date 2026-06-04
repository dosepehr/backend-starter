import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { auditContext } from './audit.context';
import { AuthenticatedUser } from 'utils/interfaces/jwt-payload.interface';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const user = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>().user;

    const userId = user ? parseInt(user.userId, 10) : null;

    return new Observable((observer) =>
      auditContext.run({ userId }, () => next.handle().subscribe(observer)),
    );
  }
}
