import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import {
  getOperatorBarangayId,
  isGlobalOpsRole,
  OPERATOR_BARANGAY_REQUIRED,
} from '../common/ops-operator-scope';
import { CreateEvacuationCenterDto } from './dto/create-evacuation-center.dto';
import { UpdateEvacuationCenterDto } from './dto/update-evacuation-center.dto';

@Injectable()
export class EvacuationCentersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /** Active evacuation sites in the caller's barangay; optional GPS sorts nearest first. */
  async nearest(actor: JwtPayload, lat?: number, lng?: number) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: actor.sub },
      select: { barangayId: true },
    });
    const bg = profile?.barangayId;
    if (!bg) return [];
    const rows = await this.prisma.evacuationCenter.findMany({
      where: { barangayId: bg, isActive: true },
      orderBy: { name: 'asc' },
      include: { barangay: { select: { id: true, name: true, code: true } } },
    });
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return rows;
    }
    return [...rows]
      .map((r) => ({
        ...r,
        distanceKm: this.haversineKm(lat, lng, Number(r.latitude), Number(r.longitude)),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  async list(actor: JwtPayload) {
    const include = { barangay: { select: { id: true, name: true, code: true } } } as const;
    if (isGlobalOpsRole(actor)) {
      return this.prisma.evacuationCenter.findMany({
        orderBy: { name: 'asc' },
        include,
      });
    }
    const bg = await getOperatorBarangayId(this.prisma, actor);
    if (!bg) {
      throw new ForbiddenException(OPERATOR_BARANGAY_REQUIRED);
    }
    return this.prisma.evacuationCenter.findMany({
      where: { barangayId: bg },
      orderBy: { name: 'asc' },
      include,
    });
  }

  async create(
    actor: JwtPayload,
    dto: CreateEvacuationCenterDto,
    meta: { ip?: string; ua?: string },
  ) {
    let barangayId = dto.barangayId;
    if (!isGlobalOpsRole(actor)) {
      const bg = await getOperatorBarangayId(this.prisma, actor);
      if (!bg) {
        throw new ForbiddenException(OPERATOR_BARANGAY_REQUIRED);
      }
      if (barangayId != null && barangayId !== bg) {
        throw new ForbiddenException('Operators may only create evacuation centers in their assigned barangay.');
      }
      barangayId = bg;
    }
    if (barangayId) {
      const b = await this.prisma.barangay.findUnique({ where: { id: barangayId } });
      if (!b) throw new NotFoundException('Barangay not found');
    }
    const row = await this.prisma.evacuationCenter.create({
      data: {
        name: dto.name,
        barangayId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        capacity: dto.capacity,
        occupancy: dto.occupancy ?? 0,
        contactPhone: dto.contactPhone,
        notes: dto.notes,
        isActive: dto.isActive ?? true,
      },
      include: { barangay: true },
    });
    await this.audit.write({
      actorId: actor.sub,
      action: 'evacuation_center_create',
      entityType: 'EvacuationCenter',
      entityId: row.id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  async update(
    actor: JwtPayload,
    id: string,
    dto: UpdateEvacuationCenterDto,
    meta: { ip?: string; ua?: string },
  ) {
    const existing = await this.prisma.evacuationCenter.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Evacuation center not found');
    if (!isGlobalOpsRole(actor)) {
      const bg = await getOperatorBarangayId(this.prisma, actor);
      if (!bg) {
        throw new ForbiddenException(OPERATOR_BARANGAY_REQUIRED);
      }
      if (existing.barangayId !== bg) {
        throw new ForbiddenException('This evacuation center is outside your barangay scope.');
      }
      if (dto.barangayId !== undefined && dto.barangayId !== null && dto.barangayId !== bg) {
        throw new ForbiddenException('Operators cannot move a center to another barangay.');
      }
    }
    if (dto.barangayId) {
      const b = await this.prisma.barangay.findUnique({ where: { id: dto.barangayId } });
      if (!b) throw new NotFoundException('Barangay not found');
    }
    const row = await this.prisma.evacuationCenter.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.barangayId !== undefined ? { barangayId: dto.barangayId } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.occupancy !== undefined ? { occupancy: dto.occupancy } : {}),
        ...(dto.contactPhone !== undefined ? { contactPhone: dto.contactPhone } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: { barangay: true },
    });
    await this.audit.write({
      actorId: actor.sub,
      action: 'evacuation_center_update',
      entityType: 'EvacuationCenter',
      entityId: id,
      metadata: dto as unknown as Prisma.InputJsonValue,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  async remove(actor: JwtPayload, id: string, meta: { ip?: string; ua?: string }) {
    const existing = await this.prisma.evacuationCenter.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Evacuation center not found');
    if (!isGlobalOpsRole(actor)) {
      const bg = await getOperatorBarangayId(this.prisma, actor);
      if (!bg) {
        throw new ForbiddenException(OPERATOR_BARANGAY_REQUIRED);
      }
      if (existing.barangayId !== bg) {
        throw new ForbiddenException('This evacuation center is outside your barangay scope.');
      }
    }
    const row = await this.prisma.evacuationCenter.update({
      where: { id },
      data: { isActive: false },
    });
    await this.audit.write({
      actorId: actor.sub,
      action: 'evacuation_center_deactivate',
      entityType: 'EvacuationCenter',
      entityId: id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }
}
