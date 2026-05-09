import {
  ConflictException,
  GoneException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types/jwt-payload.type';

const BCRYPT_ROUNDS = 12;
const REFRESH_BYTES = 48;
const REFRESH_TTL_MS = 14 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
    });
    if (existing) {
      throw new ConflictException('Email or phone already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: UserRole.CITIZEN,
        profile: {
          create: {
            fullName: dto.fullName,
            setupCompleted: false,
          },
        },
      },
    });
    return this.issueAuthResponse(user.id, user.email, user.role, null, null);
  }

  async login(
    dto: LoginDto,
    meta: { ip?: string; userAgent?: string },
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user?.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueAuthResponse(
      user.id,
      user.email,
      user.role,
      meta.ip ?? null,
      meta.userAgent ?? null,
    );
  }

  async refresh(
    refreshToken: string,
    meta: { ip?: string; userAgent?: string },
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    if (!this.refreshEnabled()) {
      throw new GoneException(
        'Refresh tokens are disabled (set AUTH_REFRESH_TOKENS=false). Sign in again with POST /auth/login.',
      );
    }
    const hash = this.hashToken(refreshToken);
    const session = await this.prisma.session.findFirst({
      where: {
        refreshHash: hash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
    if (!session?.user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    return this.issueAuthResponse(
      session.userId,
      session.user.email,
      session.user.role,
      meta.ip ?? session.ipAddress,
      meta.userAgent ?? session.userAgent,
    );
  }

  private refreshEnabled(): boolean {
    return this.config.get<string>('AUTH_REFRESH_TOKENS', 'true') !== 'false';
  }

  private async issueAuthResponse(
    userId: string,
    email: string,
    role: UserRole,
    ip: string | null,
    userAgent: string | null,
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    const accessToken = await this.signAccessToken(userId, email, role);
    if (!this.refreshEnabled()) {
      return { accessToken };
    }
    const refreshRaw = randomBytes(REFRESH_BYTES).toString('base64url');
    const refreshHash = this.hashToken(refreshRaw);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    await this.prisma.session.create({
      data: {
        userId,
        refreshHash,
        ipAddress: ip,
        userAgent,
        expiresAt,
      },
    });
    return { accessToken, refreshToken: refreshRaw };
  }

  private async signAccessToken(userId: string, email: string, role: UserRole): Promise<string> {
    const payload: JwtPayload = { sub: userId, role, email };
    const expiresSec = Number(this.config.get<string>('JWT_ACCESS_EXPIRES_SEC', '900'));
    return this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: Number.isFinite(expiresSec) && expiresSec > 0 ? expiresSec : 900,
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
