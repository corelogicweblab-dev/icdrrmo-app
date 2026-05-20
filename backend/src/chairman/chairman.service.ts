import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IncidentStatus,
  NotificationType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import {
  BARANGAY_SCOPE_REQUIRED,
  getBarangayScopedUserId,
} from '../common/barangay-scope';
import { AuditLogService } from '../audit/audit-log.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import {
  ChairmanIncidentAction,
  ChairmanIncidentActionDto,
} from './dto/chairman-incident-action.dto';

const TERMINAL: IncidentStatus[] = [
  IncidentStatus.RESOLVED,
  IncidentStatus.CLOSED,
  IncidentStatus.FALSE_ALARM,
];

export type ChairmanFeedStatus = 'new' | 'ongoing' | 'resolved';

export function chairmanFeedStatus(status: IncidentStatus): ChairmanFeedStatus {
  if (status === IncidentStatus.OPEN) return 'new';
  if (TERMINAL.includes(status)) return 'resolved';
  return 'ongoing';
}

@Injectable()
export class ChairmanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private async requireChairmanBarangay(user: JwtPayload): Promise<string> {
    if (user.role !== UserRole.BARANGAY_CHAIRMAN) {
      throw new ForbiddenException('Barangay chairman role required');
    }
    const bg = await getBarangayScopedUserId(this.prisma, user);
    if (!bg) throw new ForbiddenException(BARANGAY_SCOPE_REQUIRED);
    return bg;
  }

  private barangayIncidentWhere(barangayId: string) {
    return {
      OR: [{ barangayId }, { reporter: { profile: { barangayId } } }],
    };
  }

  async getDashboard(user: JwtPayload) {
    const barangayId = await this.requireChairmanBarangay(user);
    const [barangay, profile, openCount, ongoingCount, resolvedToday] =
      await Promise.all([
        this.prisma.barangay.findUnique({ where: { id: barangayId } }),
        this.prisma.userProfile.findUnique({
          where: { userId: user.sub },
          select: { fullName: true },
        }),
        this.prisma.incident.count({
          where: {
            ...this.barangayIncidentWhere(barangayId),
            status: IncidentStatus.OPEN,
          },
        }),
        this.prisma.incident.count({
          where: {
            ...this.barangayIncidentWhere(barangayId),
            status: {
              in: [
                IncidentStatus.ACKNOWLEDGED,
                IncidentStatus.DISPATCHED,
                IncidentStatus.IN_PROGRESS,
              ],
            },
          },
        }),
        this.prisma.incident.count({
          where: {
            ...this.barangayIncidentWhere(barangayId),
            status: { in: [IncidentStatus.RESOLVED, IncidentStatus.CLOSED] },
            updatedAt: { gte: new Date(Date.now() - 86_400_000) },
          },
        }),
      ]);

    return {
      chairmanName: profile?.fullName ?? user.email,
      barangay,
      stats: { openCount, ongoingCount, resolvedToday },
      firstResponder: true,
    };
  }

  async listIncidents(user: JwtPayload) {
    const barangayId = await this.requireChairmanBarangay(user);
    const rows = await this.prisma.incident.findMany({
      where: this.barangayIncidentWhere(barangayId),
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        reporter: {
          select: {
            id: true,
            email: true,
            phone: true,
            profile: {
              select: {
                fullName: true,
                streetPurok: true,
                barangay: { select: { name: true } },
              },
            },
          },
        },
        barangay: { select: { id: true, name: true, code: true } },
      },
    });

    return rows.map((row) => ({
      ...row,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      feedStatus: chairmanFeedStatus(row.status),
      urgencyLevel: row.isCritical ? 'critical' : 'high',
    }));
  }

  async getIncident(user: JwtPayload, incidentId: string) {
    const barangayId = await this.requireChairmanBarangay(user);
    const row = await this.prisma.incident.findFirst({
      where: { id: incidentId, ...this.barangayIncidentWhere(barangayId) },
      include: {
        reporter: {
          select: {
            id: true,
            email: true,
            phone: true,
            profile: {
              select: {
                fullName: true,
                streetPurok: true,
                medicalConditions: true,
                bloodType: true,
                barangay: { select: { name: true } },
              },
            },
          },
        },
        barangay: { select: { id: true, name: true, code: true } },
        logs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!row) throw new NotFoundException('Incident not found in your barangay');
    return {
      ...row,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      feedStatus: chairmanFeedStatus(row.status),
      urgencyLevel: row.isCritical ? 'critical' : 'high',
    };
  }

  async applyAction(
    user: JwtPayload,
    incidentId: string,
    dto: ChairmanIncidentActionDto,
    meta?: { ip?: string; ua?: string },
  ) {
    const barangayId = await this.requireChairmanBarangay(user);
    const existing = await this.prisma.incident.findFirst({
      where: { id: incidentId, ...this.barangayIncidentWhere(barangayId) },
    });
    if (!existing) throw new NotFoundException('Incident not found in your barangay');

    const { status, logAction } = this.mapAction(dto.action);
    const previousStatus = existing.status;

    const updated = await this.prisma.incident.update({
      where: { id: incidentId },
      data: {
        status,
        ...(status === IncidentStatus.RESOLVED || status === IncidentStatus.CLOSED
          ? { closedAt: new Date() }
          : {}),
      },
      include: {
        reporter: { select: { id: true, email: true, phone: true, profile: true } },
        barangay: { select: { id: true, name: true, code: true } },
      },
    });

    await this.prisma.incidentLog.create({
      data: {
        incidentId,
        action: logAction,
        createdById: user.sub,
        details: {
          chairmanAction: dto.action,
          note: dto.note ?? null,
          previousStatus,
          newStatus: status,
        },
      },
    });

    await this.audit.write({
      actorId: user.sub,
      action: `chairman_${dto.action}`,
      entityType: 'incident',
      entityId: incidentId,
      metadata: { previousStatus, newStatus: status, note: dto.note ?? null },
      ipAddress: meta?.ip ?? null,
      userAgent: meta?.ua ?? null,
    });

    this.realtime.emitIncidentUpdated({
      incidentId,
      status,
      reporterId: updated.reporterId,
    });
    this.realtime.emitChairmanIncident({
      barangayId,
      incidentId,
      status,
      feedStatus: chairmanFeedStatus(status),
    });

    return {
      ...updated,
      latitude: Number(updated.latitude),
      longitude: Number(updated.longitude),
      feedStatus: chairmanFeedStatus(updated.status),
    };
  }

  private mapAction(action: ChairmanIncidentAction): {
    status: IncidentStatus;
    logAction: string;
  } {
    switch (action) {
      case 'acknowledge':
        return { status: IncidentStatus.ACKNOWLEDGED, logAction: 'chairman_acknowledged' };
      case 'dispatch':
        return { status: IncidentStatus.DISPATCHED, logAction: 'chairman_dispatched' };
      case 'resolve':
        return { status: IncidentStatus.RESOLVED, logAction: 'chairman_resolved' };
      default:
        throw new BadRequestException('Invalid action');
    }
  }

  async listAuditLogs(user: JwtPayload) {
    await this.requireChairmanBarangay(user);
    return this.prisma.auditLog.findMany({
      where: { actorId: user.sub },
      orderBy: { createdAt: 'desc' },
      take: 80,
    });
  }

  async getSystemHealth(user: JwtPayload) {
    await this.requireChairmanBarangay(user);
    let database = false;
    let pushConfigured = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = true;
    } catch {
      database = false;
    }
    try {
      pushConfigured = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim());
    } catch {
      pushConfigured = false;
    }
    const redisConfigured = Boolean(process.env.REDIS_URL?.trim());
    return {
      alertSystemOnline: database,
      database,
      pushConfigured,
      smsFallbackAvailable: redisConfigured,
      checkedAt: new Date().toISOString(),
    };
  }

  async registerDeviceToken(
    user: JwtPayload,
    token: string,
    platform: string,
  ): Promise<{ ok: true }> {
    if (user.role !== UserRole.BARANGAY_CHAIRMAN) {
      throw new ForbiddenException('Barangay chairman role required');
    }
    const plat = platform.toUpperCase();
    const allowed = ['ANDROID', 'IOS', 'WEB'];
    if (!allowed.includes(plat)) {
      throw new BadRequestException('platform must be ANDROID, IOS, or WEB');
    }
    await this.prisma.deviceToken.upsert({
      where: { token },
      create: {
        userId: user.sub,
        token,
        platform: plat as 'ANDROID' | 'IOS' | 'WEB',
      },
      update: {
        userId: user.sub,
        platform: plat as 'ANDROID' | 'IOS' | 'WEB',
        lastSeenAt: new Date(),
      },
    });
    return { ok: true };
  }
}
