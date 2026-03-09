import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { auditContext } from '../context/audit.context';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  // audit.interceptor.ts - موقت اضافه کن
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user ? parseInt(request.user.userId) : null;
    console.log('🔍 AuditInterceptor - userId:', userId); // ← اضافه کن
    console.log('🔍 AuditInterceptor - user:', request.user); // ← اضافه کن

    return new Observable((observer) => {
      auditContext.run({ userId }, () => {
        console.log('🔍 auditContext store:', auditContext.getStore()); // ← اضافه کن
        next.handle().subscribe({
          next: (val) => observer.next(val),
          error: (err) => observer.error(err),
          complete: () => observer.complete(),
        });
      });
    });
  }
}
