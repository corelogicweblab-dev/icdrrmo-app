import { Injectable } from '@nestjs/common';
import { IncidentStatus, ResponderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const terminal = [
      IncidentStatus.CLOSED,
      IncidentStatus.FALSE_ALARM,
      IncidentStatus.RESOLVED,
    ];
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
          status: {
            in: [
              ResponderStatus.AVAILABLE,
              ResponderStatus.DISPATCHED,
              ResponderStatus.EN_ROUTE,
              ResponderStatus.ON_SCENE,
              ResponderStatus.TRANSPORTING,
            ],
          },
        },
      }),
      this.prisma.vehicle.count({ where: { isActive: true } }),
      this.prisma.evacuationCenter.count({ where: { isActive: true } }),
      this.prisma.barangay.count(),
      this.prisma.user.count({ where: { isActive: true } }),
    ]);

    return {
      openIncidents,
      activeResponders: responders,
      activeVehicles: vehicles,
      evacuationSites: evacuationCenters,
      barangays,
      activeUsers: users,
    };
  }
}
