import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
import { PatchMyProfileDto } from './dto/patch-my-profile.dto';
import { getOperatorBarangayId } from '../common/ops-operator-scope';
import { FirestoreMirrorService } from '../firestore/firestore-mirror.service';

const BCRYPT_ROUNDS = 12;
const ONLINE_WINDOW_MS = 120_000;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly firestoreMirror: FirestoreMirrorService,
  ) {}

  async getMe(userId: string): Promise<unknown> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: { include: { barangay: true } },
        responder: {
          include: {
            vehicle: true,
            locations: { orderBy: { recordedAt: 'desc' }, take: 1 },
            assignments: {
              orderBy: { createdAt: 'desc' },
              take: 12,
              select: {
                id: true,
                title: true,
                status: true,
                type: true,
                latitude: true,
                longitude: true,
                createdAt: true,
              },
            },
            dispatchAssignments: {
              orderBy: { createdAt: 'desc' },
              take: 12,
              include: {
                incident: {
                  select: {
                    id: true,
                    title: true,
                    status: true,
                    latitude: true,
                    longitude: true,
                  },
                },
              },
            },
          },
        },
        notifications: {
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 25,
        },
      },
    });
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

  async patchMe(userId: string, dto: PatchMyProfileDto): Promise<unknown> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!existing?.profile) throw new NotFoundException('User not found');
    if (dto.phone !== undefined && dto.phone !== null) {
      const clash = await this.prisma.user.findFirst({
        where: { phone: dto.phone, NOT: { id: userId } },
      });
      if (clash) throw new ConflictException('Phone already in use');
    }
    if (dto.barangayId) {
      const b = await this.prisma.barangay.findUnique({ where: { id: dto.barangayId } });
      if (!b) throw new ConflictException('Invalid barangayId');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        profile: {
          update: {
            ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
            ...(dto.barangayId !== undefined ? { barangayId: dto.barangayId } : {}),
            ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
            ...(dto.address !== undefined ? { address: dto.address } : {}),
            ...(dto.bloodType !== undefined ? { bloodType: dto.bloodType } : {}),
            ...(dto.allergies !== undefined ? { allergies: dto.allergies } : {}),
            ...(dto.medicalConditions !== undefined
              ? { medicalConditions: dto.medicalConditions }
              : {}),
            ...(dto.emergencyNotes !== undefined ? { emergencyNotes: dto.emergencyNotes } : {}),
            ...(dto.profilePhotoUrl !== undefined
              ? { profilePhotoUrl: dto.profilePhotoUrl }
              : {}),
            ...(dto.availabilityStatus !== undefined
              ? { availabilityStatus: dto.availabilityStatus }
              : {}),
          },
        },
      },
      include: { profile: { include: { barangay: true } }, responder: { include: { vehicle: true } } },
    });
    void this.firestoreMirror.syncUserProfile(userId);
    return updated;
  }

  async list(
    actor: JwtPayload,
    dto: ListUsersQueryDto,
  ): Promise<{
    items: unknown[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    let operatorBarangay: string | null = null;
    if (actor.role === UserRole.OPERATOR) {
      operatorBarangay = await getOperatorBarangayId(this.prisma, actor);
      if (!operatorBarangay) {
        throw new ForbiddenException(
          'Operator accounts must have a barangay on their profile to list users.',
        );
      }
    }
    const where: Prisma.UserWhereInput = {
      ...(dto.search
        ? {
            email: { contains: dto.search, mode: 'insensitive' },
          }
        : {}),
      ...(dto.role ? { role: dto.role } : {}),
      ...(operatorBarangay
        ? { profile: { is: { barangayId: operatorBarangay } } }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: { include: { barangay: { select: { id: true, name: true, code: true } } } },
          responder: { select: { id: true, status: true, badgeNumber: true } },
        },
      }),
    ]);
    const onlineCutoff = new Date(Date.now() - ONLINE_WINDOW_MS);
    const userIds = rows.map((r) => r.id);
    const onlineSet = new Set<string>();
    if (userIds.length > 0) {
      const lastSeen = await this.prisma.deviceToken.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, lastSeenAt: { gte: onlineCutoff } },
        _max: { lastSeenAt: true },
      });
      for (const s of lastSeen) onlineSet.add(s.userId);
    }
    const items = rows.map((u) => ({
      id: u.id,
      email: u.email,
      phone: u.phone,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      profile: u.profile,
      responder: u.responder,
      online: onlineSet.has(u.id),
    }));
    return { items, total, page, limit };
  }

  async getById(actor: JwtPayload, id: string): Promise<unknown> {
    const u = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: { include: { barangay: true } },
        responder: { include: { vehicle: true } },
      },
    });
    if (!u) throw new NotFoundException('User not found');
    if (actor.role === UserRole.OPERATOR) {
      const bg = await getOperatorBarangayId(this.prisma, actor);
      if (!bg || u.profile?.barangayId !== bg) {
        throw new ForbiddenException('This user is outside your barangay scope.');
      }
    }
    return u;
  }

  async create(actor: JwtPayload, dto: CreateUserDto, meta: { ip?: string; ua?: string }): Promise<unknown> {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');
    if (dto.phone) {
      const p = await this.prisma.user.findFirst({ where: { phone: dto.phone } });
      if (p) throw new ConflictException('Phone already in use');
    }
    if (dto.barangayId) {
      const b = await this.prisma.barangay.findUnique({ where: { id: dto.barangayId } });
      if (!b) throw new ConflictException('Invalid barangayId');
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: dto.role,
        isActive: dto.isActive ?? true,
        profile: {
          create: {
            fullName: dto.fullName,
            barangayId: dto.barangayId,
            setupCompleted: true,
          },
        },
      },
      include: { profile: true },
    });
    await this.audit.write({
      actorId: actor.sub,
      action: 'user_create',
      entityType: 'User',
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    void this.firestoreMirror.syncUserProfile(user.id);
    return user;
  }

  async update(
    actor: JwtPayload,
    id: string,
    dto: UpdateUserDto,
    meta: { ip?: string; ua?: string },
  ): Promise<unknown> {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
    if (!existing) throw new NotFoundException('User not found');

    if (actor.role === UserRole.OPERATOR) {
      if (dto.role !== undefined || dto.isActive !== undefined || dto.password !== undefined) {
        throw new ForbiddenException('Operators may only update profile fields for users in their barangay.');
      }
      const bg = await getOperatorBarangayId(this.prisma, actor);
      if (!bg || existing.profile?.barangayId !== bg) {
        throw new ForbiddenException('This user is outside your barangay scope.');
      }
    }

    if (dto.phone !== undefined && dto.phone !== null) {
      const clash = await this.prisma.user.findFirst({
        where: { phone: dto.phone, NOT: { id } },
      });
      if (clash) throw new ConflictException('Phone already in use');
    }
    if (dto.barangayId) {
      const b = await this.prisma.barangay.findUnique({ where: { id: dto.barangayId } });
      if (!b) throw new ConflictException('Invalid barangayId');
    }
    if (actor.role === UserRole.OPERATOR && dto.barangayId !== undefined && dto.barangayId !== null) {
      const bg = await getOperatorBarangayId(this.prisma, actor);
      if (dto.barangayId !== bg) {
        throw new ForbiddenException('Operators cannot move a user to another barangay.');
      }
    }

    const passwordHash =
      dto.password !== undefined
        ? await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
        : undefined;
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(passwordHash !== undefined ? { passwordHash } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        profile: {
          update: {
            ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
            ...(dto.barangayId !== undefined ? { barangayId: dto.barangayId } : {}),
            ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
            ...(dto.address !== undefined ? { address: dto.address } : {}),
            ...(dto.bloodType !== undefined ? { bloodType: dto.bloodType } : {}),
            ...(dto.allergies !== undefined ? { allergies: dto.allergies } : {}),
            ...(dto.medicalConditions !== undefined
              ? { medicalConditions: dto.medicalConditions }
              : {}),
            ...(dto.emergencyNotes !== undefined ? { emergencyNotes: dto.emergencyNotes } : {}),
            ...(dto.profilePhotoUrl !== undefined
              ? { profilePhotoUrl: dto.profilePhotoUrl }
              : {}),
            ...(dto.availabilityStatus !== undefined
              ? { availabilityStatus: dto.availabilityStatus }
              : {}),
          },
        },
      },
      include: { profile: true, responder: true },
    });
    await this.audit.write({
      actorId: actor.sub,
      action: 'user_update',
      entityType: 'User',
      entityId: id,
      metadata: dto as unknown as Prisma.InputJsonValue,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    void this.firestoreMirror.syncUserProfile(id);
    return user;
  }

  async deactivate(actor: JwtPayload, id: string, meta: { ip?: string; ua?: string }): Promise<unknown> {
    if (id === actor.sub) {
      throw new ConflictException('Cannot deactivate your own account');
    }
    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      include: { profile: true },
    });
    await this.audit.write({
      actorId: actor.sub,
      action: 'user_deactivate',
      entityType: 'User',
      entityId: id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    void this.firestoreMirror.syncUserProfile(id);
    return user;
  }
}
