import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const AUDIT_FIELDS = ['created', 'updated', 'deleted', 'recovered'] as const;

function transformAuditEntity(obj: Record<string, any>): Record<string, any> {
  const result = { ...obj };

  for (const field of AUDIT_FIELDS) {
    const userKey = `${field}ByUser`;
    const idKey = `${field}By`;

    if (userKey in result) {
      result[idKey] = result[userKey]
        ? { id: result[userKey].id, name: result[userKey].name }
        : null;
      delete result[userKey];
    }
  }

  return result;
}

function transformAudit(data: any): any {
  if (Array.isArray(data)) {
    return data.map(transformAudit);
  }

  if (data && typeof data === 'object') {
    // pagination: { items: [...], meta: {} }
    if ('items' in data && Array.isArray(data.items)) {
      return { ...data, items: data.items.map(transformAudit) };
    }

    // audit field داره → entity هست
    const hasAuditField = AUDIT_FIELDS.some(
      (f) => `${f}ByUser` in data || `${f}By` in data,
    );
    if (hasAuditField) {
      return transformAuditEntity(data);
    }

    return data;
  }

  return data;
}

@Injectable()
export class AuditTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((response) => {
        // حالت ۱: ResponseInterceptor قبلاً wrap کرده → { status: true, data: ... }
        if (
          response !== null &&
          typeof response === 'object' &&
          'status' in response &&
          'data' in response
        ) {
          return { ...response, data: transformAudit(response.data) };
        }

        // حالت ۲: هنوز raw هست → مستقیم transform کن
        return transformAudit(response);
      }),
    );
  }
}
