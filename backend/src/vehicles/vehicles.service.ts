import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  list() {
    return this.prisma.vehicle.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        responders: {
          take: 5,
          include: { user: { select: { id: true, email: true } } },
        },
      },
    });
  }

  async create(actor: JwtPayload, dto: CreateVehicleDto, meta: { ip?: string; ua?: string }) {
    const plate = dto.plateNumber.trim().toUpperCase();
    const v = await this.prisma.vehicle.create({
      data: {
        plateNumber: plate,
        name: dto.name,
        type: dto.type,
        fleetStatus: dto.fleetStatus,
        isActive: dto.isActive ?? true,
        latitude: dto.latitude ?? undefined,
        longitude: dto.longitude ?? undefined,
        lastLocationAt:
          dto.latitude != null && dto.longitude != null ? new Date() : undefined,
      },
    });
    await this.audit.write({
      actorId: actor.sub,
      action: 'vehicle_create',
      entityType: 'Vehicle',
      entityId: v.id,
      metadata: { plate } as Prisma.InputJsonValue,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return v;
  }

  async update(
    actor: JwtPayload,
    id: string,
    dto: UpdateVehicleDto,
    meta: { ip?: string; ua?: string },
  ) {
    const existing = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Vehicle not found');
    if (dto.plateNumber) {
      const clash = await this.prisma.vehicle.findFirst({
        where: { plateNumber: dto.plateNumber.trim().toUpperCase(), NOT: { id } },
      });
      if (clash) throw new ConflictException('Plate number already in use');
    }
    const locUpdate =
      dto.latitude !== undefined || dto.longitude !== undefined
        ? {
            latitude: dto.latitude ?? null,
            longitude: dto.longitude ?? null,
            lastLocationAt:
              dto.latitude != null && dto.longitude != null ? new Date() : null,
          }
        : {};
    const v = await this.prisma.vehicle.update({
      where: { id },
      data: {
        ...(dto.plateNumber !== undefined
          ? { plateNumber: dto.plateNumber.trim().toUpperCase() }
          : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.fleetStatus !== undefined ? { fleetStatus: dto.fleetStatus } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...locUpdate,
      },
    });
    await this.audit.write({
      actorId: actor.sub,
      action: 'vehicle_update',
      entityType: 'Vehicle',
      entityId: id,
      metadata: dto as unknown as Prisma.InputJsonValue,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return v;
  }

  async remove(actor: JwtPayload, id: string, meta: { ip?: string; ua?: string }) {
    const v = await this.prisma.vehicle.update({
      where: { id },
      data: { isActive: false },
    });
    await this.audit.write({
      actorId: actor.sub,
      action: 'vehicle_deactivate',
      entityType: 'Vehicle',
      entityId: id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return v;
  }
}
