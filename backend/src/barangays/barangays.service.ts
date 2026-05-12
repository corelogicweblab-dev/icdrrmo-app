import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { UserRole } from '@prisma/client';
import { getOperatorBarangayId } from '../common/ops-operator-scope';
import { UpdateBarangayOpsHazardDto } from './dto/update-barangay-ops-hazard.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class BarangaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  list() {
    return this.prisma.barangay.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /** Public list for registration (no secrets). */
  listPublic() {
    return this.prisma.barangay.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
  }

  async userCountsByBarangay() {
    const grouped = await this.prisma.userProfile.groupBy({
      by: ['barangayId'],
      where: { barangayId: { not: null } },
      _count: { _all: true },
    });
    const barangays = await this.prisma.barangay.findMany({ orderBy: { name: 'asc' } });
    const countMap = new Map<string | null, number>();
    for (const g of grouped) {
      countMap.set(g.barangayId, g._count._all);
    }
    return barangays.map((b) => ({
      barangay: b,
      registeredUsers: countMap.get(b.id) ?? 0,
    }));
  }

  async updateOpsHazard(
    actor: JwtPayload,
    barangayId: string,
    dto: UpdateBarangayOpsHazardDto,
    meta: { ip?: string; ua?: string },
  ) {
    if (actor.role === UserRole.OPERATOR) {
      const scope = await getOperatorBarangayId(this.prisma, actor);
      if (!scope || scope !== barangayId) {
        throw new ForbiddenException('You may only update hazard flags for your assigned barangay.');
      }
    }

    const before = await this.prisma.barangay.findUnique({ where: { id: barangayId } });
    if (!before) throw new NotFoundException('Barangay not found');

    const patch: Prisma.BarangayUpdateInput = {
      opsHazardUpdatedAt: new Date(),
    };
    if (dto.opsFloodActive !== undefined) patch.opsFloodActive = dto.opsFloodActive;
    if (dto.opsFloodMessage !== undefined) {
      patch.opsFloodMessage = dto.opsFloodMessage.trim() ? dto.opsFloodMessage.trim() : null;
    }
    if (dto.opsRedZoneActive !== undefined) patch.opsRedZoneActive = dto.opsRedZoneActive;
    if (dto.opsRedZoneMessage !== undefined) {
      patch.opsRedZoneMessage = dto.opsRedZoneMessage.trim() ? dto.opsRedZoneMessage.trim() : null;
    }

    const after = await this.prisma.barangay.update({
      where: { id: barangayId },
      data: patch,
    });

    const changed =
      before.opsFloodActive !== after.opsFloodActive ||
      before.opsRedZoneActive !== after.opsRedZoneActive ||
      (before.opsFloodMessage ?? '') !== (after.opsFloodMessage ?? '') ||
      (before.opsRedZoneMessage ?? '') !== (after.opsRedZoneMessage ?? '');
    const anyActive = after.opsFloodActive || after.opsRedZoneActive;

    if (anyActive && changed) {
      const floodLine = after.opsFloodActive
        ? `Flood advisory: ${(after.opsFloodMessage ?? 'Avoid flooded areas; follow barangay / LGU instructions.').trim()}`
        : '';
      const redLine = after.opsRedZoneActive
        ? `Danger / red zone: ${(after.opsRedZoneMessage ?? 'Stay away from the cordoned area unless authorized.').trim()}`
        : '';
      const body = [floodLine, redLine].filter(Boolean).join('\n\n').slice(0, 3500);
      const title = `Emergency — ${after.name}`;
      await this.notifications.notifyCitizensInBarangay({
        barangayId: after.id,
        title: title.slice(0, 200),
        body,
        data: {
          barangayCode: after.code,
          flood: String(after.opsFloodActive),
          redZone: String(after.opsRedZoneActive),
        },
        actorId: actor.sub,
        meta,
      });
      this.realtime.emitEmergencyNotification({ title, body: body.slice(0, 800) });
    }

    return after;
  }
}
