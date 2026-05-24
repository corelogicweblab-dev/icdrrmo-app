import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IncidentStatus, RoutedAgency, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { AuditLogService } from '../audit/audit-log.service';
import { OPS_DESK_WRITE_ROLES } from '../common/ops-desk-roles';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import type { AgencyCallTarget } from './dto/trigger-agency-call.dto';

const OPEN_STATUSES: IncidentStatus[] = [
  IncidentStatus.OPEN,
  IncidentStatus.ACKNOWLEDGED,
  IncidentStatus.DISPATCHED,
  IncidentStatus.IN_PROGRESS,
  IncidentStatus.RESOLVED,
];

@Injectable()
export class AgencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private agencyForRole(role: UserRole): RoutedAgency | null {
    if (role === UserRole.BFP) return RoutedAgency.BFP;
    if (role === UserRole.PNP) return RoutedAgency.PNP;
    return null;
  }

  async getDashboard(user: JwtPayload): Promise<{
    agency: string;
    stats: { open: number; dispatched: number; resolvedToday: number };
  }> {
    const agency = this.agencyForRole(user.role);
    if (!agency) {
      throw new ForbiddenException('Agency role required');
    }
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const baseWhere = { routedAgency: agency };
    const [open, dispatched, resolvedToday] = await Promise.all([
      this.prisma.incident.count({
        where: {
          ...baseWhere,
          status: { in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED] },
        },
      }),
      this.prisma.incident.count({
        where: { ...baseWhere, status: { in: [IncidentStatus.DISPATCHED, IncidentStatus.IN_PROGRESS] } },
      }),
      this.prisma.incident.count({
        where: {
          ...baseWhere,
          status: IncidentStatus.RESOLVED,
          updatedAt: { gte: startOfDay },
        },
      }),
    ]);
    return {
      agency,
      stats: { open, dispatched, resolvedToday },
    };
  }

  async listIncidents(user: JwtPayload): Promise<unknown[]> {
    const agency = this.agencyForRole(user.role);
    if (!agency) {
      throw new ForbiddenException('Agency role required');
    }
    return this.prisma.incident.findMany({
      where: {
        routedAgency: agency,
        status: { notIn: [IncidentStatus.CLOSED, IncidentStatus.FALSE_ALARM] },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        reporter: { select: { id: true, email: true, phone: true, profile: true } },
        assigned: { include: { user: { select: { id: true, email: true } } } },
        barangay: { select: { name: true, code: true } },
      },
    });
  }

  async triggerCall(user: JwtPayload, target: AgencyCallTarget, incidentId?: string, message?: string): Promise<{
    callId: string;
    target: AgencyCallTarget;
  }> {
    if (!OPS_DESK_WRITE_ROLES.includes(user.role)) {
      throw new ForbiddenException('Operations role required to trigger agency calls');
    }
    if (incidentId) {
      const incident = await this.prisma.incident.findUnique({ where: { id: incidentId } });
      if (!incident) {
        throw new NotFoundException('Incident not found');
      }
    }
    const callId = randomUUID();
    const payload = {
      callId,
      target,
      incidentId: incidentId ?? null,
      message: message?.trim() || 'ICDRRMO EOC is requesting immediate voice contact.',
      opsUserId: user.sub,
      opsEmail: user.email ?? null,
      at: new Date().toISOString(),
    };
    this.realtime.emitAgencyCallAlert(payload);
    await this.audit.write({
      actorId: user.sub,
      action: 'agency_call_triggered',
      entityType: 'agency_call',
      entityId: callId,
      metadata: payload,
    });
    return { callId, target };
  }

  async acknowledgeCall(user: JwtPayload, callId: string): Promise<{ ok: true }> {
    const role = user.role;
    if (role !== UserRole.BFP && role !== UserRole.PNP && role !== UserRole.BARANGAY_CHAIRMAN) {
      throw new ForbiddenException('Agency or chairman role required');
    }
    if (!callId?.trim()) {
      throw new BadRequestException('callId required');
    }
    this.realtime.emitAgencyCallAck({
      callId,
      userId: user.sub,
      role: user.role,
      at: new Date().toISOString(),
    });
    await this.audit.write({
      actorId: user.sub,
      action: 'agency_call_acknowledged',
      entityType: 'agency_call',
      entityId: callId,
    });
    return { ok: true };
  }
}
