/**
 * Organization Helper Utilities
 *
 * Hỗ trợ filter dữ liệu theo organization, đồng thời cho phép
 * một số user có quyền "super_admin" được xem tất cả organization.
 */

import type { AuthUser } from '../types';

export const SUPER_ADMIN_PERMISSION = 'super_admin';

/**
 * Trả về điều kiện filter theo organization cho mọi truy vấn Prisma.
 * - User thường: chỉ thấy dữ liệu trong organization của mình.
 * - Super admin (có permission 'super_admin'): xem được tất cả org (không filter).
 */
export async function getOrganizationFilter(user: AuthUser): Promise<{ organizationId?: string }> {
  if (user.permissions?.includes(SUPER_ADMIN_PERMISSION)) {
    return {}; // Super admin: không filter theo organization
  }

  return { organizationId: user.organizationId };
}
