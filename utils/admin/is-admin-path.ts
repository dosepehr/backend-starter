import { ADMIN_ROOT_PATH } from './admin.constants';

/** True only for the AdminJS mount itself (e.g. "/admin" or "/admin/..."), not lookalike prefixes like "/admin-reports". */
export function isAdminPath(path: string): boolean {
  return path === ADMIN_ROOT_PATH || path.startsWith(`${ADMIN_ROOT_PATH}/`);
}
