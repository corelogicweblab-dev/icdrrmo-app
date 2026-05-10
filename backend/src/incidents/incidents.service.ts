import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  EmergencyType,
  IncidentChannel,
  IncidentStatus,
  Prisma,
  ResponderStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSosDto } from './dto/create-sos.dto';
import { CreateOpsIncidentDto } from './dto/create-ops-incident.dto';
import { PatchIncidentDto } from './dto/patch-incident.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { JobsService } from '../jobs/jobs.service';
import {
  getOperatorBarangayId,
  isGlobalOpsRole,
  OPERATOR_BARANGAY_REQUIRED,
} from '../common/ops-operator-scope';

const DEDUPE_WINDOW_MS = 120_000;

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly jobs: JobsService,
  ) {}

  async createSosFromApp(
    user: JwtPayload,
    dto: CreateSosDto,
  ): Promise<{ incidentId: string; deduplicated: boolean }> {
    await this.assertSosRateLimit(user.sub);
    const recent = await this.prisma.incident.findFirst({
      where: {
        reporterId: user.sub,
        status: { in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED] },
        createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      this.logger.warn(`SOS dedupe hit for user=${user.sub} incident=${recent.id}`);
      return { incidentId: recent.id, deduplicated: true };
    }
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: user.sub },
    });
    const incident = await this.prisma.incident.create({
      data: {
        reporterId: user.sub,
        type: dto.type,
        channel: IncidentChannel.MOBILE_APP,
        latitude: dto.latitude,
        longitude: dto.longitude,
        batteryLevel: dto.batteryLevel ?? profile?.lastKnownBattery ?? undefined,
        signalStrength: dto.signalStrength ?? profile?.lastSignalQuality ?? undefined,
        description: dto.description,
        title: `SOS — ${dto.type}`,
        barangayId: profile?.barangayId ?? undefined,
      },
    });
    await this.prisma.incidentLog.create({
      data: {
        incidentId: incident.id,
        action: 'incident_created',
        details: { source: 'mobile_app', type: dto.type },
        createdById: user.sub,
      },
    });
    this.realtime.emitIncidentCreated({
      incidentId: incident.id,
      reporterId: incident.reporterId,
      latitude: Number(incident.latitude),
      longitude: Number(incident.longitude),
      type: incident.type,
      title: incident.title,
    });
    return { incidentId: incident.id, deduplicated: false };
  }

  async createFromSms(params: {
    reporterId: string;
    type: EmergencyType;
    latitude: number;
    longitude: number;
    battery: number | null;
    rawBody: string;
  }): Promise<{ incidentId: string }> {
    const incident = await this.prisma.incident.create({
      data: {
        reporterId: params.reporterId,
        type: params.type,
        channel: IncidentChannel.SMS,
        latitude: params.latitude,
        longitude: params.longitude,
        batteryLevel: params.battery ?? undefined,
        rawSmsBody: params.rawBody,
        title: `SMS SOS — ${params.type}`,
      },
    });
    await this.prisma.incidentLog.create({
      data: {
        incidentId: incident.id,
        action: 'incident_created',
        details: { source: 'sms' },
      },
    });
    this.realtime.emitIncidentCreated({
      incidentId: incident.id,
      reporterId: incident.reporterId,
      latitude: Number(incident.latitude),
      longitude: Number(incident.longitude),
      type: incident.type,
      title: incident.title,
    });
    return { incidentId: incident.id };
  }

  async listOpenForOps(user: JwtPayload): Promise<unknown[]> {
    if (
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.SUPER_ADMIN &&
      user.role !== UserRole.OPERATOR
    ) {
      throw new ForbiddenException('Operations role required');
    }
    const baseWhere = { status: { notIn: [IncidentStatus.CLOSED, IncidentStatus.FALSE_ALARM] } };
    if (isGlobalOpsRole(user)) {
      return this.prisma.incident.findMany({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          reporter: { select: { id: true, email: true, phone: true, profile: true } },
          assigned: { include: { user: { select: { id: true, email: true } } } },
        },
      });
    }
    const bg = await getOperatorBarangayId(this.prisma, user);
    if (!bg) {
      throw new ForbiddenException(OPERATOR_BARANGAY_REQUIRED);
    }
    return this.prisma.incident.findMany({
      where: {
        ...baseWhere,
        OR: [{ barangayId: bg }, { reporter: { profile: { barangayId: bg } } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        reporter: { select: { id: true, email: true, phone: true, profile: true } },
        assigned: { include: { user: { select: { id: true, email: true } } } },
      },
    });
  }

  async listAssignableResponders(user: JwtPayload): Promise<
    Array<{
      id: string;
      badgeNumber: string | null;
      status: ResponderStatus;
      email: string;
    }>
  > {
    if (
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.SUPER_ADMIN &&
      user.role !== UserRole.OPERATOR
    ) {
      throw new ForbiddenException('Operations role required');
    }
    const statusWhere: Prisma.ResponderWhereInput = {
      status: {
        in: [
          ResponderStatus.AVAILABLE,
          ResponderStatus.DISPATCHED,
          ResponderStatus.EN_ROUTE,
          ResponderStatus.ON_SCENE,
          ResponderStatus.TRANSPORTING,
          ResponderStatus.COMPLETED,
          ResponderStatus.OFF_DUTY,
        ],
      },
    };
    let whereResponder: Prisma.ResponderWhereInput = statusWhere;
    if (user.role === UserRole.OPERATOR) {
      const bg = await getOperatorBarangayId(this.prisma, user);
      if (!bg) {
        throw new ForbiddenException(OPERATOR_BARANGAY_REQUIRED);
      }
      whereResponder = { ...statusWhere, user: { profile: { barangayId: bg } } };
    }
    const rows = await this.prisma.responder.findMany({
      where: whereResponder,
      include: { user: { select: { email: true } } },
      orderBy: { badgeNumber: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      badgeNumber: r.badgeNumber,
      status: r.status,
      email: r.user.email,
    }));
  }

  async patchIncidentForOps(
    user: JwtPayload,
    id: string,
    dto: PatchIncidentDto,
  ): Promise<unknown> {
    if (
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.SUPER_ADMIN &&
      user.role !== UserRole.OPERATOR
    ) {
      throw new ForbiddenException('Operations role required');
    }

    const existing = await this.prisma.incident.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Incident not found');
    }

    if (user.role === UserRole.OPERATOR) {
      const bg = await getOperatorBarangayId(this.prisma, user);
      if (!bg) {
        throw new ForbiddenException(OPERATOR_BARANGAY_REQUIRED);
      }
      const allowed = await this.incidentVisibleToOperatorBarangay(existing, bg);
      if (!allowed) {
        throw new ForbiddenException('Incident is outside your barangay scope.');
      }
    }

    if (dto.status === undefined && dto.assignedResponderId === undefined && !dto.notifyReporterSms) {
      throw new BadRequestException('No mutable fields supplied');
    }

    if (
      dto.assignedResponderId !== undefined &&
      dto.assignedResponderId !== null
    ) {
      const responder = await this.prisma.responder.findUnique({
        where: { id: dto.assignedResponderId },
        include: {
          user: {
            include: {
              profile: { select: { barangayId: true } },
            },
          },
        },
      });
      if (!responder) {
        throw new BadRequestException('assignedResponderId not found');
      }
      if (user.role === UserRole.OPERATOR) {
        const bg = await getOperatorBarangayId(this.prisma, user);
        if (!bg) {
          throw new ForbiddenException(OPERATOR_BARANGAY_REQUIRED);
        }
        if (responder.user.profile?.barangayId !== bg) {
          throw new ForbiddenException('You may only assign responders from your barangay.');
        }
      }
    }

    const previousStatus = existing.status;
    const previousResponderId = existing.assignedResponderId;

    const data: {
      status?: IncidentStatus;
      assignedResponderId?: string | null;
      closedAt?: Date | null;
    } = {};

    if (dto.status !== undefined) {
      data.status = dto.status;
      const terminal = new Set<IncidentStatus>([
        IncidentStatus.RESOLVED,
        IncidentStatus.CLOSED,
        IncidentStatus.FALSE_ALARM,
      ]);
      const openish = new Set<IncidentStatus>([
        IncidentStatus.OPEN,
        IncidentStatus.ACKNOWLEDGED,
        IncidentStatus.DISPATCHED,
        IncidentStatus.IN_PROGRESS,
      ]);
      if (terminal.has(dto.status)) {
        data.closedAt = new Date();
      } else if (openish.has(dto.status)) {
        data.closedAt = null;
      }
    }

    if (dto.assignedResponderId !== undefined) {
      data.assignedResponderId = dto.assignedResponderId;
    }

    if (Object.keys(data).length === 0 && !dto.notifyReporterSms) {
      throw new BadRequestException('No mutable fields supplied');
    }

    const includeRel = {
      reporter: { select: { id: true, email: true, phone: true, profile: true } },
      assigned: { include: { user: { select: { id: true, email: true } } } },
    } as const;

    let updatedRow: {
      id: string;
      reporterId: string | null;
      status: IncidentStatus;
      reporter: {
        id: string;
        email: string;
        phone: string | null;
        profile: unknown;
      } | null;
      assigned: {
        id: string;
        user: { id: string; email: string };
      } | null;
    };

    try {
      updatedRow =
        Object.keys(data).length > 0
          ? await this.prisma.incident.update({
              where: { id },
              data,
              include: includeRel,
            })
          : await this.prisma.incident.findUniqueOrThrow({
              where: { id },
              include: includeRel,
            });
    } catch {
      throw new NotFoundException('Incident not found');
    }

    const logDetails: Record<string, unknown> = {
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.assignedResponderId !== undefined
        ? { assignedResponderId: dto.assignedResponderId }
        : {}),
    };

    await this.prisma.incidentLog.create({
      data: {
        incidentId: id,
        action: 'incident_updated',
        details: logDetails as Prisma.InputJsonValue,
        createdById: user.sub,
      },
    });

    const statusChanged =
      dto.status !== undefined && dto.status !== previousStatus;
    const assignChanged =
      dto.assignedResponderId !== undefined &&
      (dto.assignedResponderId ?? null) !== (previousResponderId ?? null);
    const replayNotify = dto.notifyReporterSms === true;

    this.realtime.emitIncidentUpdated({
      incidentId: id,
      status: updatedRow.status,
      reporterId: updatedRow.reporterId,
    });

    const terminal: ReadonlySet<IncidentStatus> = new Set([
      IncidentStatus.RESOLVED,
      IncidentStatus.CLOSED,
      IncidentStatus.FALSE_ALARM,
    ]);
    if (terminal.has(updatedRow.status)) {
      this.realtime.emitIncidentClosed({ incidentId: id });
    }

    if (statusChanged || assignChanged || replayNotify) {
      await this.jobs.enqueueIncidentNotify({
        incidentId: id,
        reporterId: updatedRow.reporterId,
        status: updatedRow.status,
        previousStatus,
      });
    }

    if (dto.notifyReporterSms === true && updatedRow.reporterId) {
      const reporter = await this.prisma.user.findUnique({
        where: { id: updatedRow.reporterId },
        select: { phone: true },
      });
      const msg = `ICDRRMO: incident ${id.slice(0, 8)} — status ${updatedRow.status}`;
      await this.jobs.enqueueSmsRetry({
        incidentId: id,
        toPhone: reporter?.phone ?? null,
        message: msg,
      });
    }

    return updatedRow;
  }

  async createByOps(
    user: JwtPayload,
    dto: CreateOpsIncidentDto,
  ): Promise<{ id: string }> {
    if (
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.SUPER_ADMIN &&
      user.role !== UserRole.OPERATOR
    ) {
      throw new ForbiddenException('Operations role required');
    }
    let barangayId = dto.barangayId;
    if (user.role === UserRole.OPERATOR) {
      const bg = await getOperatorBarangayId(this.prisma, user);
      if (!bg) {
        throw new ForbiddenException(OPERATOR_BARANGAY_REQUIRED);
      }
      if (barangayId != null && barangayId !== bg) {
        throw new ForbiddenException('Operators may only file incidents for their assigned barangay.');
      }
      barangayId = bg;
    }
    if (barangayId) {
      const b = await this.prisma.barangay.findUnique({ where: { id: barangayId } });
      if (!b) throw new BadRequestException('Invalid barangayId');
    }
    const incident = await this.prisma.incident.create({
      data: {
        reporterId: user.sub,
        type: dto.type,
        status: dto.status ?? IncidentStatus.OPEN,
        channel: IncidentChannel.ADMIN,
        latitude: dto.latitude,
        longitude: dto.longitude,
        title: dto.title?.trim() || `EOC — ${dto.type}`,
        description: dto.description?.trim(),
        barangayId,
      },
    });
    await this.prisma.incidentLog.create({
      data: {
        incidentId: incident.id,
        action: 'incident_created',
        details: { source: 'ops_console', type: dto.type },
        createdById: user.sub,
      },
    });
    this.realtime.emitIncidentCreated({
      incidentId: incident.id,
      reporterId: incident.reporterId,
      latitude: Number(incident.latitude),
      longitude: Number(incident.longitude),
      type: incident.type,
      title: incident.title,
    });
    return { id: incident.id };
  }

  private async incidentVisibleToOperatorBarangay(
    incident: { barangayId: string | null; reporterId: string | null },
    barangayId: string,
  ): Promise<boolean> {
    if (incident.barangayId === barangayId) return true;
    if (!incident.reporterId) return false;
    const p = await this.prisma.userProfile.findUnique({
      where: { userId: incident.reporterId },
      select: { barangayId: true },
    });
    return p?.barangayId === barangayId;
  }

  private async assertSosRateLimit(userId: string): Promise<void> {
    const windowStart = new Date(Date.now() - 60_000);
    const count = await this.prisma.incident.count({
      where: { reporterId: userId, createdAt: { gte: windowStart } },
    });
    if (count >= 5) {
      throw new HttpException('SOS rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
