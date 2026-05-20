import { UserRole } from '@prisma/client';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { isGlobalOpsRole } from './barangay-scope';

/** Roles that may open the EOC command desk (read). */
export const OPS_DESK_READ_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.OPERATOR,
  'AUDITOR' as UserRole,
];

/** Roles that may mutate incidents, dispatch, and master data. */
export const OPS_DESK_WRITE_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.OPERATOR,
];

export function canReadOpsDesk(user: JwtPayload): boolean {
  return OPS_DESK_READ_ROLES.includes(user.role);
}

export function canWriteOpsDesk(user: JwtPayload): boolean {
  return OPS_DESK_WRITE_ROLES.includes(user.role);
}

/** Auditors and global admins see city-wide data; operators are barangay-scoped. */
export function isDeskGlobalView(user: JwtPayload): boolean {
  return isGlobalOpsRole(user) || (user.role as string) === 'AUDITOR';
}
