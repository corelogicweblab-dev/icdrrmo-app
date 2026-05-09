import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateAdminNotificationDto } from './dto/create-admin-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  listRecent(take = 100) {
    return this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: { user: { select: { id: true, email: true } } },
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
}
