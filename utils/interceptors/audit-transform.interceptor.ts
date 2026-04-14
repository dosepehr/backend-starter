// utils/global/audit-transform.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function transformAudit(data: any): any {
  if (Array.isArray(data)) return data.map(transformAudit);
  if (data && typeof data === 'object') {
    const result = { ...data };

    // حذف فیلدهای raw id و جایگزینی با user object
    for (const field of [
      'created',
      'updated',
      'deleted',
      'recovered',
    ] as const) {
      const userKey = `${field}ByUser`;
      const idKey = `${field}By`;

      if (userKey in result) {
        result[`${field}By`] = result[userKey]
          ? { id: result[userKey].id, name: result[userKey].name }
          : null;
        delete result[userKey];
      } else if (idKey in result) {
        // اگر relation لود نشده، فقط id رو نگه میداره
        result[idKey] = result[idKey] ? { id: result[idKey] } : null;
      }
    }

    return result;
  }
  return data;
}

@Injectable()
export class AuditTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((response) => {
        if (response?.data) {
          return { ...response, data: transformAudit(response.data) };
        }
        return response;
      }),
    );
  }
}
