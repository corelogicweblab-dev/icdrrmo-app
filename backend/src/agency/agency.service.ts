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
import { TriggerAgencyCallDto } from './dto/trigger-agency-call.dto';

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

  private async resolveBarangayTarget(
    barangayId?: string,
    barangayCode?: string,
  ): Promise<{ id: string; name: string; code: string }> {
    if (barangayId?.trim() && barangayCode?.trim()) {
      throw new BadRequestException('Send either barangayId or barangayCode, not both');
    }
    if (barangayCode?.trim()) {
      const b = await this.prisma.barangay.findUnique({
        where: { code: barangayCode.trim().toUpperCase() },
      });
      if (!b) {
        throw new BadRequestException(
          `Unknown barangay code ${barangayCode}. Run database seed or pick from the live list.`,
        );
      }
      return b;
    }
    const id = barangayId?.trim();
    if (!id) {
      throw new BadRequestException(
        'Select a target barangay (barangayId or barangayCode) before calling an agency desk.',
      );
    }
    if (/^IC-\d{3}$/i.test(id)) {
      const b = await this.prisma.barangay.findUnique({
        where: { code: id.toUpperCase() },
      });
      if (!b) {
        throw new BadRequestException(`Barangay code ${id} not found in database.`);
      }
      return b;
    }
    const b = await this.prisma.barangay.findUnique({ where: { id } });
    if (!b) {
      throw new BadRequestException(
        'Invalid barangayId — open My profile, set your barangay, or pick again from the dropdown.',
      );
    }
    return b;
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

  async triggerCall(
    user: JwtPayload,
    dto: TriggerAgencyCallDto,
  ): Promise<{
    callId: string;
    target: AgencyCallTarget;
    barangayId: string;
    barangayName: string;
  }> {
    if (!OPS_DESK_WRITE_ROLES.includes(user.role)) {
      throw new ForbiddenException('Operations role required to trigger agency calls');
    }

    let barangay = await this.resolveBarangayTarget(dto.barangayId, dto.barangayCode);

    const incidentId = dto.incidentId?.trim() || undefined;
    if (incidentId) {
      const incident = await this.prisma.incident.findUnique({
        where: { id: incidentId },
        select: {
          id: true,
          barangayId: true,
          reporter: { select: { profile: { select: { barangayId: true } } } },
        },
      });
      if (!incident) {
        throw new NotFoundException('Incident not found');
      }
      const fromIncident =
        incident.barangayId ?? incident.reporter?.profile?.barangayId ?? null;
      if (fromIncident && fromIncident !== barangay.id) {
        const incidentBg = await this.prisma.barangay.findUnique({
          where: { id: fromIncident },
        });
        if (incidentBg) barangay = incidentBg;
      }
    }

    const callId = randomUUID();
    const baseMessage =
      dto.message?.trim() ||
      `ICDRRMO EOC — urgent contact for ${barangay.name} (${barangay.code}).`;
    const payload = {
      callId,
      target: dto.target,
      incidentId: incidentId ?? null,
      barangayId: barangay.id,
      barangayName: barangay.name,
      barangayCode: barangay.code,
      message: baseMessage,
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
    return {
      callId,
      target: dto.target,
      barangayId: barangay.id,
      barangayName: barangay.name,
    };
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
