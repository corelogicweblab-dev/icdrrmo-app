import { Injectable } from '@nestjs/common';
import { IncidentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Approximate Isabela City, Basilan — ICDRRMO operations reference point for EOC map. */
export const EOC_REFERENCE = {
  label: 'ICDRRMO Emergency Operations Center',
  latitude: 6.7048,
  longitude: 121.9715,
} as const;

@Injectable()
export class MapService {
  constructor(private readonly prisma: PrismaService) {}

  async opsLiveContext() {
    const terminal = [
      IncidentStatus.CLOSED,
      IncidentStatus.FALSE_ALARM,
      IncidentStatus.RESOLVED,
    ];
    const [incidents, responders, vehicles, evacuationCenters] = await this.prisma.$transaction([
      this.prisma.incident.findMany({
        where: { status: { notIn: terminal } },
        orderBy: { createdAt: 'desc' },
        take: 300,
        include: {
          assigned: { include: { user: { select: { email: true } } } },
          barangay: { select: { id: true, name: true } },
        },
      }),
      this.prisma.responder.findMany({
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
        where: { isActive: true },
        include: { barangay: { select: { id: true, name: true } } },
      }),
    ]);

    return {
      eoc: EOC_REFERENCE,
      incidents,
      responders,
      vehicles,
      evacuationCenters,
    };
  }
}
