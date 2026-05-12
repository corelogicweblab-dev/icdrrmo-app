import { ForbiddenException, Injectable } from '@nestjs/common';
import { IncidentStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import {
  getOperatorBarangayId,
  isGlobalOpsRole,
  OPERATOR_BARANGAY_REQUIRED,
} from '../common/ops-operator-scope';
import { getIsabelaHazardBarangayPins } from './isabela-hazard-barangay-locations';

/**
 * CDRRMO / ICDRRMO EOC field reference — west of Basilan Circumferential Rd (near Kasinnahan),
 * Isabela City, Basilan (WGS84). Validate with LGU GPS / survey monument.
 */
export const EOC_REFERENCE = {
  label:
    'ICDRRMO / CDRRMO EOC — west of Basilan Circumferential Road, Menzi / Sunrise Village area, Isabela City, Basilan 7300',
  latitude: 6.70325,
  longitude: 121.98235,
} as const;

@Injectable()
export class MapService {
  constructor(private readonly prisma: PrismaService) {}

  async opsLiveContext(actor: JwtPayload) {
    const terminal = [
      IncidentStatus.CLOSED,
      IncidentStatus.FALSE_ALARM,
      IncidentStatus.RESOLVED,
    ];
    let incidentWhere: Prisma.IncidentWhereInput = { status: { notIn: terminal } };
    let responderWhere: Prisma.ResponderWhereInput = {};
    let evacuationWhere: Prisma.EvacuationCenterWhereInput = { isActive: true };

    if (!isGlobalOpsRole(actor)) {
      let bg: string | null = null;
      if (actor.role === UserRole.RESPONDER) {
        const r = await this.prisma.responder.findUnique({
          where: { userId: actor.sub },
          include: { user: { include: { profile: { select: { barangayId: true } } } } },
        });
        bg = r?.user.profile?.barangayId ?? null;
      } else {
        bg = await getOperatorBarangayId(this.prisma, actor);
      }
      if (!bg) {
        throw new ForbiddenException(
          actor.role === UserRole.RESPONDER
            ? 'Responder accounts need a barangay on their profile to load the scoped map.'
            : OPERATOR_BARANGAY_REQUIRED,
        );
      }
      incidentWhere = {
        ...incidentWhere,
        OR: [{ barangayId: bg }, { reporter: { profile: { barangayId: bg } } }],
      };
      responderWhere = { user: { profile: { barangayId: bg } } };
      evacuationWhere = { isActive: true, barangayId: bg };
    }

    const [incidents, responders, vehicles, evacuationCenters] = await this.prisma.$transaction([
      this.prisma.incident.findMany({
        where: incidentWhere,
        orderBy: { createdAt: 'desc' },
        take: 300,
        include: {
          assigned: { include: { user: { select: { email: true } } } },
          barangay: { select: { id: true, name: true } },
        },
      }),
      this.prisma.responder.findMany({
        where: responderWhere,
        include: {
          user: { select: { id: true, email: true } },
          vehicle: true,
          locations: { orderBy: { recordedAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.vehicle.findMany({
        where: { isActive: true },
        orderBy: { plateNumber: 'asc' },
      }),
      this.prisma.evacuationCenter.findMany({
        where: evacuationWhere,
        include: { barangay: { select: { id: true, name: true } } },
      }),
    ]);

    return {
      eoc: EOC_REFERENCE,
      hazardBarangayPins: getIsabelaHazardBarangayPins(),
      incidents,
      responders,
      vehicles,
      evacuationCenters,
    };
  }
}
