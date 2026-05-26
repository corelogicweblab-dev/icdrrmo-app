import {
  BadRequestException,
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
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { getOperatorBarangayId } from '../common/ops-operator-scope';
import { FirestoreMirrorService } from '../firestore/firestore-mirror.service';

const BCRYPT_ROUNDS = 12;
const ONLINE_WINDOW_MS = 120_000;

const OPERATOR_ASSIGNABLE_ROLES = new Set<UserRole>([
  UserRole.BARANGAY_CHAIRMAN,
  UserRole.RESPONDER,
]);

const PRIVILEGED_USER_ROLES = new Set<UserRole>([
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.OPERATOR,
  UserRole.AUDITOR,
]);

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
    if (existing.role === UserRole.PNP || existing.role === UserRole.BFP) {
      if (dto.barangayId !== undefined || dto.barangayCode) {
        throw new BadRequestException(
          'Agency desk accounts (PNP/BFP) are city-wide and cannot be assigned to a barangay',
        );
      }
    }
    if (dto.phone !== undefined && dto.phone !== null) {
      const clash = await this.prisma.user.findFirst({
        where: { phone: dto.phone, NOT: { id: userId } },
      });
      if (clash) throw new ConflictException('Phone already in use');
    }
    if (dto.barangayId != null && dto.barangayId !== '' && dto.barangayCode) {
      throw new BadRequestException('Send either barangayId or barangayCode, not both');
    }
    let resolvedBarangayId: string | null | undefined = undefined;
    if (dto.barangayCode != null && dto.barangayCode.trim() !== '') {
      const b = await this.prisma.barangay.findUnique({ where: { code: dto.barangayCode.trim() } });
      if (!b) throw new ConflictException('Invalid barangay code');
      resolvedBarangayId = b.id;
    } else if (dto.barangayId !== undefined) {
      resolvedBarangayId = dto.barangayId;
      if (dto.barangayId) {
        const b = await this.prisma.barangay.findUnique({ where: { id: dto.barangayId } });
        if (!b) throw new ConflictException('Invalid barangayId');
      }
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        profile: {
          update: {
            ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
            ...(resolvedBarangayId !== undefined ? { barangayId: resolvedBarangayId } : {}),
            ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
            ...(dto.address !== undefined ? { address: dto.address } : {}),
            ...(dto.streetPurok !== undefined ? { streetPurok: dto.streetPurok } : {}),
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
            address: dto.address?.trim() || undefined,
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

    let profileBarangayId = dto.barangayId;

    if (actor.role === UserRole.OPERATOR) {
      if (dto.password !== undefined || dto.isActive !== undefined) {
        throw new ForbiddenException('Operators cannot change passwords or account active status.');
      }
      const bg = await getOperatorBarangayId(this.prisma, actor);
      if (!bg) {
        throw new ForbiddenException('Your operator account must be linked to a barangay.');
      }
      if (existing.profile?.barangayId !== bg) {
        throw new ForbiddenException('This user is outside your barangay scope.');
      }
      if (dto.role !== undefined) {
        if (!OPERATOR_ASSIGNABLE_ROLES.has(dto.role)) {
          throw new ForbiddenException(
            'Operators may only assign Barangay Chairman or Responder roles.',
          );
        }
        if (PRIVILEGED_USER_ROLES.has(existing.role)) {
          throw new ForbiddenException('Cannot change role for this account.');
        }
        if (dto.role === UserRole.BARANGAY_CHAIRMAN) {
          profileBarangayId = bg;
        }
      }
      if (profileBarangayId !== undefined && profileBarangayId !== null && profileBarangayId !== bg) {
        throw new ForbiddenException('Operators cannot move a user to another barangay.');
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
            ...(profileBarangayId !== undefined ? { barangayId: profileBarangayId } : {}),
            ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
            ...(dto.address !== undefined ? { address: dto.address } : {}),
            ...(dto.streetPurok !== undefined ? { streetPurok: dto.streetPurok } : {}),
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

  async upsertDeviceToken(userId: string, dto: RegisterDeviceTokenDto): Promise<{ ok: true }> {
    const platform = dto.platform ?? 'UNKNOWN';
    await this.prisma.deviceToken.upsert({
      where: { token: dto.token },
      create: { userId, token: dto.token, platform, lastSeenAt: new Date() },
      update: { userId, platform, lastSeenAt: new Date() },
    });
    return { ok: true };
  }

  async removeDeviceToken(userId: string, token: string): Promise<{ ok: true }> {
    await this.prisma.deviceToken.deleteMany({ where: { userId, token } });
    return { ok: true };
  }
}
