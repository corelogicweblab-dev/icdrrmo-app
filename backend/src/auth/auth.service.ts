import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FirestoreMirrorService } from '../firestore/firestore-mirror.service';
import { FirebaseAdminService } from '../firestore/firebase-admin.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types/jwt-payload.type';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly firestoreMirror: FirestoreMirrorService,
    private readonly firebaseAdmin: FirebaseAdminService,
  ) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string }> {
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
    void this.firestoreMirror.syncUserProfile(user.id);
    return this.issueAccessToken(user.id, user.email, user.role);
  }

  /**
   * Firebase Auth custom token: `uid` == PostgreSQL user id so the mobile/web SDK can read
   * `citizen_profiles/{uid}` under Firestore security rules.
   */
  async issueFirebaseCustomToken(user: JwtPayload): Promise<{ customToken: string }> {
    if (!this.firebaseAdmin.isEnabled()) {
      throw new ServiceUnavailableException(
        'Firebase Admin is not configured (set FIREBASE_SERVICE_ACCOUNT_JSON or equivalent on the API).',
      );
    }
    await this.firestoreMirror.syncUserProfile(user.sub);
    const customToken = await this.firebaseAdmin.createCustomToken(user.sub, {
      role: String(user.role),
      email: user.email,
    });
    return { customToken };
  }

  async login(
    dto: LoginDto,
    _meta: { ip?: string; userAgent?: string },
  ): Promise<{ accessToken: string }> {
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
    return this.issueAccessToken(user.id, user.email, user.role);
  }

  private async issueAccessToken(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<{ accessToken: string }> {
    const accessToken = await this.signAccessToken(userId, email, role);
    return { accessToken };
  }

  private async signAccessToken(userId: string, email: string, role: UserRole): Promise<string> {
    const payload: JwtPayload = { sub: userId, role, email };
    const expiresSec = Number(this.config.get<string>('JWT_ACCESS_EXPIRES_SEC', '900'));
    return this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: Number.isFinite(expiresSec) && expiresSec > 0 ? expiresSec : 900,
    });
  }
}
