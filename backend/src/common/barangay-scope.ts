import { UserRole } from '@prisma/client';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { PrismaService } from '../prisma/prisma.service';

export function isGlobalOpsRole(user: JwtPayload): boolean {
  return user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
}

export function isBarangayScopedRole(role: UserRole): boolean {
  return role === UserRole.OPERATOR || role === UserRole.BARANGAY_CHAIRMAN;
}

/** Barangay assigned on profile (operator desk or barangay chairman). */
export async function getBarangayScopedUserId(
  prisma: PrismaService,
  user: JwtPayload,
): Promise<string | null> {
  if (!isBarangayScopedRole(user.role)) return null;
  const p = await prisma.userProfile.findUnique({
    where: { userId: user.sub },
    select: { barangayId: true },
  });
  return p?.barangayId ?? null;
}

/** @deprecated Use {@link getBarangayScopedUserId} */
export async function getOperatorBarangayId(
  prisma: PrismaService,
  user: JwtPayload,
): Promise<string | null> {
  if (user.role !== UserRole.OPERATOR) return null;
  return getBarangayScopedUserId(prisma, user);
}

export const BARANGAY_SCOPE_REQUIRED =
  'This account must have a barangay set on the user profile (UserProfile.barangay_id).';

export const OPERATOR_BARANGAY_REQUIRED = BARANGAY_SCOPE_REQUIRED;
