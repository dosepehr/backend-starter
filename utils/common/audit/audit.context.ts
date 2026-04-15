import { AsyncLocalStorage } from 'async_hooks';

export interface AuditContext {
  userId: number | null;
}

export const auditContext = new AsyncLocalStorage<AuditContext>();
