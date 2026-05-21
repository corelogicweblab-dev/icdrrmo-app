import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IncidentStatus, Prisma, ResponderStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import {
  getOperatorBarangayId,
  isGlobalOpsRole,
  OPERATOR_BARANGAY_REQUIRED,
} from '../common/ops-operator-scope';
import { CreateResponderDto } from './dto/create-responder.dto';
import { UpdateResponderDto } from './dto/update-responder.dto';

@Injectable()
export class RespondersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(actor: JwtPayload) {
    const include = {
      user: { select: { id: true, email: true, phone: true, isActive: true } },
      vehicle: true,
      locations: { orderBy: { recordedAt: 'desc' as const }, take: 1 },
    } as const;
    if (isGlobalOpsRole(actor)) {
      return this.prisma.responder.findMany({
        orderBy: { updatedAt: 'desc' },
        include,
      });
    }
    const bg = await getOperatorBarangayId(this.prisma, actor);
    if (!bg) {
      throw new ForbiddenException(OPERATOR_BARANGAY_REQUIRED);
    }
    return this.prisma.responder.findMany({
      where: { user: { profile: { barangayId: bg } } },
      orderBy: { updatedAt: 'desc' },
      include,
    });
  }

  async create(actor: JwtPayload, dto: CreateResponderDto, meta: { ip?: string; ua?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');
    const existing = await this.prisma.responder.findUnique({ where: { userId: dto.userId } });
    if (existing) throw new ConflictException('User already has a responder profile');
    if (dto.vehicleId) {
      const v = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
      if (!v) throw new ConflictException('Invalid vehicleId');
    }
    await this.prisma.user.update({
      where: { id: dto.userId },
      data: { role: UserRole.RESPONDER },
    });
    const r = await this.prisma.responder.create({
      data: {
        userId: dto.userId,
        badgeNumber: dto.badgeNumber,
        status: dto.status ?? ResponderStatus.OFF_DUTY,
        vehicleId: dto.vehicleId ?? undefined,
      },
      include: { user: { select: { id: true, email: true } }, vehicle: true },
    });
    await this.audit.write({
      actorId: actor.sub,
      action: 'responder_create',
      entityType: 'Responder',
      entityId: r.id,
      metadata: { userId: dto.userId } as Prisma.InputJsonValue,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return r;
  }

  async update(
    actor: JwtPayload,
    id: string,
    dto: UpdateResponderDto,
    meta: { ip?: string; ua?: string },
  ) {
    const row = await this.prisma.responder.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Responder not found');
    if (dto.vehicleId) {
      const v = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
      if (!v) throw new ConflictException('Invalid vehicleId');
    }
    const r = await this.prisma.responder.update({
      where: { id },
      data: {
        ...(dto.badgeNumber !== undefined ? { badgeNumber: dto.badgeNumber } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.vehicleId !== undefined ? { vehicleId: dto.vehicleId } : {}),
      },
      include: { user: { select: { id: true, email: true } }, vehicle: true },
    });
    await this.audit.write({
      actorId: actor.sub,
      action: 'responder_update',
      entityType: 'Responder',
      entityId: id,
      metadata: dto as unknown as Prisma.InputJsonValue,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return r;
  }

  async remove(actor: JwtPayload, id: string, meta: { ip?: string; ua?: string }) {
    const row = await this.prisma.responder.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Responder not found');
    await this.prisma.responder.delete({ where: { id } });
    await this.prisma.user.update({
      where: { id: row.userId },
      data: { role: UserRole.CITIZEN },
    });
    await this.audit.write({
      actorId: actor.sub,
      action: 'responder_delete',
      entityType: 'Responder',
      entityId: id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return { ok: true };
  }

  /** Field responder dashboard — assignments, medical context, performance. */
  async fieldDashboard(actor: JwtPayload) {
    if (actor.role !== UserRole.RESPONDER) {
      throw new ForbiddenException('Responder role required');
    }
    const responder = await this.prisma.responder.findUnique({
      where: { userId: actor.sub },
      include: {
        vehicle: true,
        user: {
          select: {
            email: true,
            phone: true,
            profile: {
              select: {
                fullName: true,
                bloodType: true,
                allergies: true,
                medicalConditions: true,
                barangay: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    if (!responder) {
      return {
        configured: false,
        message: 'No responder roster record — contact ops admin.',
      };
    }
    const active = await this.prisma.incident.findMany({
      where: {
        assignedResponderId: responder.id,
        status: {
          notIn: [IncidentStatus.CLOSED, IncidentStatus.FALSE_ALARM, IncidentStatus.RESOLVED],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        barangay: { select: { name: true } },
        reporter: {
          select: {
            phone: true,
            profile: {
              select: {
                fullName: true,
                bloodType: true,
                allergies: true,
                medicalConditions: true,
              },
            },
            emergencyContacts: {
              orderBy: { priority: 'asc' },
              take: 3,
              select: { fullName: true, phone: true, relationship: true },
            },
          },
        },
      },
    });
    const since30d = new Date(Date.now() - 30 * 86_400_000);
    const [resolved30d, totalAssigned30d] = await Promise.all([
      this.prisma.incident.count({
        where: {
          assignedResponderId: responder.id,
          status: { in: [IncidentStatus.RESOLVED, IncidentStatus.CLOSED] },
          updatedAt: { gte: since30d },
        },
      }),
      this.prisma.incident.count({
        where: { assignedResponderId: responder.id, createdAt: { gte: since30d } },
      }),
    ]);
    return {
      configured: true,
      generatedAt: new Date().toISOString(),
      responder: {
        id: responder.id,
        status: responder.status,
        badgeNumber: responder.badgeNumber,
        vehicle: responder.vehicle,
      },
      profile: responder.user.profile,
      assignments: active.map((i) => ({
        id: i.id,
        type: i.type,
        status: i.status,
        title: i.title,
        latitude: Number(i.latitude),
        longitude: Number(i.longitude),
        barangayName: i.barangay?.name,
        createdAt: i.createdAt.toISOString(),
        routeUrl: `https://www.google.com/maps/dir/?api=1&destination=${Number(i.latitude)},${Number(i.longitude)}`,
        citizenMedical: i.reporter?.profile
          ? {
              fullName: i.reporter.profile.fullName,
              bloodType: i.reporter.profile.bloodType,
              allergies: i.reporter.profile.allergies,
              medicalConditions: i.reporter.profile.medicalConditions,
              phone: i.reporter.phone,
              emergencyContacts: i.reporter.emergencyContacts,
            }
          : null,
      })),
      performance: {
        resolved30d,
        assigned30d: totalAssigned30d,
        resolutionRatePct:
          totalAssigned30d > 0 ? Math.round((resolved30d / totalAssigned30d) * 100) : 0,
      },
      communications: {
        opsChannel: 'WebRTC voice via incident SOS panel',
        citizenContact: 'Use assignment medical phone or ops dispatch',
      },
    };
  }
}
