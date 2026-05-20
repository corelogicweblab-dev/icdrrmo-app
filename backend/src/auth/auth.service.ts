import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { BloodType, Gender, UserRole } from '@prisma/client';
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
    if (dto.barangayId && dto.barangayCode) {
      throw new BadRequestException('Send either barangayId or barangayCode, not both');
    }
    if (!dto.barangayId && !dto.barangayCode) {
      throw new BadRequestException('Barangay is required (barangayId or barangayCode)');
    }
    let barangayId: string | undefined;
    if (dto.barangayId) {
      const b = await this.prisma.barangay.findUnique({ where: { id: dto.barangayId } });
      if (!b) throw new BadRequestException('Invalid barangay');
      barangayId = b.id;
    } else if (dto.barangayCode) {
      const code = dto.barangayCode.trim().toUpperCase();
      const b = await this.prisma.barangay.findUnique({ where: { code } });
      if (!b) throw new BadRequestException('Invalid barangay code');
      barangayId = b.id;
    }
    const street = String(dto.streetPurok).trim();
    const birthday = this.parseBirthday(dto.birthday);
    this.assertReasonableBirthday(birthday);
    const gender = dto.gender as Gender;
    const bloodType = dto.bloodType as BloodType;
    const profilePhotoUrl = this.normalizeProfilePhotoUrl(dto.profilePhotoUrl.trim());
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: UserRole.CITIZEN,
        profile: {
          create: {
            fullName: dto.fullName.trim(),
            setupCompleted: true,
            barangayId: barangayId!,
            streetPurok: street,
            birthday,
            gender,
            bloodType,
            medicalConditions: dto.medicalConditions.trim(),
            profilePhotoUrl,
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

  private parseBirthday(ymd: string): Date {
    const [y, m, d] = ymd.split('-').map((x) => Number(x));
    if (!y || !m || !d) throw new BadRequestException('Invalid birthday');
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
  }

  private assertReasonableBirthday(birthday: Date): void {
    const now = new Date();
    if (birthday.getTime() > now.getTime()) {
      throw new BadRequestException('Date of birth cannot be in the future');
    }
    let age = now.getUTCFullYear() - birthday.getUTCFullYear();
    const m = now.getUTCMonth() - birthday.getUTCMonth();
    if (m < 0 || (m === 0 && now.getUTCDate() < birthday.getUTCDate())) {
      age -= 1;
    }
    if (age < 1) throw new BadRequestException('Registrant must be at least 1 year old');
    if (age > 120) throw new BadRequestException('Invalid date of birth');
  }

  private normalizeProfilePhotoUrl(raw: string): string {
    if (raw.length > 600_000) {
      throw new BadRequestException('Profile picture payload is too large (max ~600KB encoded)');
    }
    if (raw.startsWith('data:image/')) {
      if (!/^data:image\/(jpeg|png|webp);base64,/i.test(raw)) {
        throw new BadRequestException('Profile picture must be JPEG, PNG, or WebP base64 data URL');
      }
      return raw;
    }
    if (/^https:\/\//i.test(raw)) {
      return raw;
    }
    throw new BadRequestException('Profile picture must be a data:image/...;base64,... URL or https:// URL');
  }

  /** Random password for OIDC-only accounts (never used for local login). */
  async hashForOidcProvision(): Promise<string> {
    return bcrypt.hash(crypto.randomBytes(32).toString('hex'), BCRYPT_ROUNDS);
  }

  async issueAccessTokenForUser(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<string> {
    return this.signAccessToken(userId, email, role);
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
