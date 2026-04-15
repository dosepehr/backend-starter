import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { auditContext } from './audit.context';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user ? parseInt(request.user.userId) : null;

    return new Observable((observer) => {
      auditContext.run({ userId }, () => {
        next.handle().subscribe({
          next: (val) => observer.next(val),
          error: (err) => observer.error(err),
          complete: () => observer.complete(),
        });
      });
    });
  }
}
