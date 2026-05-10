import { Injectable } from '@nestjs/common';
import { IncidentStatus, Prisma, ResponderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import {
  getOperatorBarangayId,
  isGlobalOpsRole,
  OPERATOR_BARANGAY_REQUIRED,
} from '../common/ops-operator-scope';

const ACTIVE_RESPONDER_STATUSES: ResponderStatus[] = [
  ResponderStatus.AVAILABLE,
  ResponderStatus.DISPATCHED,
  ResponderStatus.EN_ROUTE,
  ResponderStatus.ON_SCENE,
  ResponderStatus.TRANSPORTING,
];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(actor: JwtPayload) {
    const terminal = [
      IncidentStatus.CLOSED,
      IncidentStatus.FALSE_ALARM,
      IncidentStatus.RESOLVED,
    ];

    if (isGlobalOpsRole(actor)) {
      const [
        openIncidents,
        responders,
        vehicles,
        evacuationCenters,
        barangays,
        users,
      ] = await this.prisma.$transaction([
        this.prisma.incident.count({
          where: { status: { notIn: terminal } },
        }),
        this.prisma.responder.count({
          where: {
            status: { in: ACTIVE_RESPONDER_STATUSES },
          },
        }),
        this.prisma.vehicle.count({ where: { isActive: true } }),
        this.prisma.evacuationCenter.count({ where: { isActive: true } }),
        this.prisma.barangay.count(),
        this.prisma.user.count({ where: { isActive: true } }),
      ]);

      return {
        scoped: false as const,
        openIncidents,
        activeResponders: responders,
        activeVehicles: vehicles,
        evacuationSites: evacuationCenters,
        barangays,
        activeUsers: users,
      };
    }

    const bg = await getOperatorBarangayId(this.prisma, actor);
    if (!bg) {
      return {
        scoped: true as const,
        operatorBarangayMissing: true as const,
        message: OPERATOR_BARANGAY_REQUIRED,
        openIncidents: 0,
        activeResponders: 0,
        activeVehicles: 0,
        evacuationSites: 0,
        barangays: 0,
        activeUsers: 0,
      };
    }

    const incidentWhere: Prisma.IncidentWhereInput = {
      status: { notIn: terminal },
      OR: [{ barangayId: bg }, { reporter: { profile: { barangayId: bg } } }],
    };

    const [
      openIncidents,
      responders,
      vehicles,
      evacuationCenters,
      barangays,
      usersInBg,
    ] = await this.prisma.$transaction([
      this.prisma.incident.count({ where: incidentWhere }),
      this.prisma.responder.count({
        where: {
          user: { profile: { barangayId: bg } },
          status: { in: ACTIVE_RESPONDER_STATUSES },
        },
      }),
      this.prisma.vehicle.count({ where: { isActive: true } }),
      this.prisma.evacuationCenter.count({ where: { isActive: true, barangayId: bg } }),
      this.prisma.barangay.count({ where: { id: bg } }),
      this.prisma.user.count({
        where: { isActive: true, profile: { barangayId: bg } },
      }),
    ]);

    return {
      scoped: true as const,
      operatorBarangayId: bg,
      openIncidents,
      activeResponders: responders,
      activeVehicles: vehicles,
      evacuationSites: evacuationCenters,
      barangays,
      activeUsers: usersInBg,
    };
  }
}
