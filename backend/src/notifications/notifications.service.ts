import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateAdminNotificationDto } from './dto/create-admin-notification.dto';
import { CreateBarangayAlertDto } from './dto/create-barangay-alert.dto';
import { PushService, type PushChannel } from '../push/push.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CitizenDashboardService } from '../citizen-dashboard/citizen-dashboard.service';
import { getOperatorBarangayId } from '../common/ops-operator-scope';

const NOTIFICATION_CREATE_CHUNK = 200;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly push: PushService,
    private readonly realtime: RealtimeGateway,
    private readonly citizenDashboard: CitizenDashboardService,
  ) {}

  listRecent(take = 100) {
    return this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: { user: { select: { id: true, email: true } } },
    });
  }

  listForUser(userId: string, take = 50) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async broadcast(
    actor: JwtPayload,
    dto: CreateAdminNotificationDto,
    meta: { ip?: string; ua?: string },
  ) {
    const users = await this.prisma.user.findMany({
      where: { id: { in: dto.userIds } },
      select: { id: true },
    });
    if (users.length !== dto.userIds.length) {
      throw new NotFoundException('One or more user IDs were not found');
    }
    const type = dto.type ?? NotificationType.SYSTEM;
    const rows = await this.prisma.$transaction(
      dto.userIds.map((userId) =>
        this.prisma.notification.create({
          data: {
            userId,
            title: dto.title,
            body: dto.body,
            type,
          },
        }),
      ),
    );
    await this.audit.write({
      actorId: actor.sub,
      action: 'notification_broadcast',
      entityType: 'Notification',
      entityId: null,
      metadata: { count: rows.length, type } as Prisma.InputJsonValue,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return { created: rows.length };
  }

  /** Scheduled + in-app: all active citizens with optional high-priority FCM. */
  async notifyAllActiveCitizens(params: {
    title: string;
    body: string;
    type: NotificationType;
    channel: PushChannel;
    data?: Record<string, string>;
    actorId?: string;
  }): Promise<{ users: number; notificationsCreated: number; fcm: { tokensAttempted: number; success: number } }> {
    const citizens = await this.prisma.user.findMany({
      where: { role: 'CITIZEN', isActive: true },
      select: { id: true, profile: { select: { barangayId: true } } },
    });
    const userIds = citizens.map((u) => u.id);
    const data = {
      kind: params.type,
      ...(params.data ?? {}),
    };
    const created = await this.createNotificationsChunked(userIds, {
      title: params.title,
      body: params.body,
      type: params.type,
      payload: data as Prisma.InputJsonValue,
    });
    const fcm = await this.push.sendToUserIds(userIds, params.title, params.body, data, params.channel);
    if (params.actorId) {
      await this.audit.write({
        actorId: params.actorId,
        action: 'notification_broadcast_citizens',
        entityType: 'Notification',
        entityId: null,
        metadata: { type: params.type, users: userIds.length, fcm } as Prisma.InputJsonValue,
      });
    }
    this.syncCitizenFeeds(
      citizens.map((u) => ({ userId: u.id, barangayId: u.profile?.barangayId ?? null })),
      'broadcast_citizens',
    );
    return { users: userIds.length, notificationsCreated: created, fcm };
  }

  /** Citizens registered in a barangay — emergency channel + in-app rows. */
  async notifyCitizensInBarangay(params: {
    barangayId: string;
    title: string;
    body: string;
    data?: Record<string, string>;
    actorId: string;
    meta: { ip?: string; ua?: string };
  }): Promise<{ users: number; notificationsCreated: number; fcm: { tokensAttempted: number; success: number } }> {
    const profiles = await this.prisma.userProfile.findMany({
      where: { barangayId: params.barangayId },
      select: { userId: true },
    });
    const userIds = [...new Set(profiles.map((p) => p.userId))];
    const data = { kind: 'BARANGAY_HAZARD', barangayId: params.barangayId, ...(params.data ?? {}) };
    const created = await this.createNotificationsChunked(userIds, {
      title: params.title,
      body: params.body,
      type: NotificationType.EMERGENCY_ALERT,
      payload: data as Prisma.InputJsonValue,
    });
    const fcm = await this.push.sendToUserIds(userIds, params.title, params.body, data, 'emergency');
    await this.audit.write({
      actorId: params.actorId,
      action: 'barangay_hazard_push',
      entityType: 'Barangay',
      entityId: params.barangayId,
      metadata: { users: userIds.length, fcm } as Prisma.InputJsonValue,
      ipAddress: params.meta.ip,
      userAgent: params.meta.ua,
    });
    this.syncCitizenFeeds(
      userIds.map((userId) => ({ userId, barangayId: params.barangayId })),
      'barangay_alert',
    );
    return { users: userIds.length, notificationsCreated: created, fcm };
  }

  async publishBarangayAlert(
    actor: JwtPayload,
    dto: CreateBarangayAlertDto,
    meta: { ip?: string; ua?: string },
  ) {
    if (actor.role === UserRole.OPERATOR) {
      const scope = await getOperatorBarangayId(this.prisma, actor);
      if (!scope || scope !== dto.barangayId) {
        throw new ForbiddenException('You may only publish alerts for your assigned barangay.');
      }
    }
    const barangay = await this.prisma.barangay.findUnique({ where: { id: dto.barangayId } });
    if (!barangay) throw new NotFoundException('Barangay not found');
    const title = dto.title.trim().slice(0, 200);
    const body = dto.body.trim().slice(0, 3500);
    return this.notifyCitizensInBarangay({
      barangayId: dto.barangayId,
      title,
      body,
      data: { barangayCode: barangay.code },
      actorId: actor.sub,
      meta,
    });
  }

  private syncCitizenFeeds(
    users: { userId: string; barangayId: string | null }[],
    reason: string,
  ): void {
    for (const { userId, barangayId } of users) {
      this.citizenDashboard.invalidateFeedCache(userId, barangayId);
      this.realtime.emitCitizenFeedUpdated(userId, { reason });
    }
  }

  private async createNotificationsChunked(
    userIds: string[],
    row: { title: string; body: string; type: NotificationType; payload?: Prisma.InputJsonValue },
  ): Promise<number> {
    if (userIds.length === 0) return 0;
    let total = 0;
    for (let i = 0; i < userIds.length; i += NOTIFICATION_CREATE_CHUNK) {
      const slice = userIds.slice(i, i + NOTIFICATION_CREATE_CHUNK);
      const res = await this.prisma.notification.createMany({
        data: slice.map((userId) => ({
          userId,
          title: row.title,
          body: row.body,
          type: row.type,
          payload: row.payload,
        })),
      });
      total += res.count;
    }
    return total;
  }
}
