import { UserRole } from '@prisma/client';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { PrismaService } from '../prisma/prisma.service';

export function isGlobalOpsRole(user: JwtPayload): boolean {
  return user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
}

/** Barangay assigned on the operator's user profile (EOC barangay desk). */
export async function getOperatorBarangayId(
  prisma: PrismaService,
  user: JwtPayload,
): Promise<string | null> {
  if (user.role !== UserRole.OPERATOR) return null;
  const p = await prisma.userProfile.findUnique({
    where: { userId: user.sub },
    select: { barangayId: true },
  });
  return p?.barangayId ?? null;
}

export const OPERATOR_BARANGAY_REQUIRED =
  'Operator accounts must have a barangay set on their user profile (UserProfile.barangay_id) to use barangay-scoped EOC features.';
