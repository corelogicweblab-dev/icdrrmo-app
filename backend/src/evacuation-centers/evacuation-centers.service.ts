import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateEvacuationCenterDto } from './dto/create-evacuation-center.dto';
import { UpdateEvacuationCenterDto } from './dto/update-evacuation-center.dto';

@Injectable()
export class EvacuationCentersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  list() {
    return this.prisma.evacuationCenter.findMany({
      orderBy: { name: 'asc' },
      include: { barangay: { select: { id: true, name: true, code: true } } },
    });
  }

  async create(
    actor: JwtPayload,
    dto: CreateEvacuationCenterDto,
    meta: { ip?: string; ua?: string },
  ) {
    if (dto.barangayId) {
      const b = await this.prisma.barangay.findUnique({ where: { id: dto.barangayId } });
      if (!b) throw new NotFoundException('Barangay not found');
    }
    const row = await this.prisma.evacuationCenter.create({
      data: {
        name: dto.name,
        barangayId: dto.barangayId,
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
