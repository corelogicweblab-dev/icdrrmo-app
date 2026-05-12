import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateAdminNotificationDto } from './dto/create-admin-notification.dto';
import { PushService, type PushChannel } from '../push/push.service';

const NOTIFICATION_CREATE_CHUNK = 200;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly push: PushService,
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
      select: { id: true },
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
    return { users: userIds.length, notificationsCreated: created, fcm };
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
