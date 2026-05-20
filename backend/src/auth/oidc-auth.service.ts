import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as client from 'openid-client';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

const STATE_TTL_MS = 10 * 60 * 1000;
const pendingStates = new Map<string, number>();

@Injectable()
export class OidcAuthService {
  private readonly logger = new Logger(OidcAuthService.name);
  private configPromise: Promise<client.Configuration> | null = null;

  constructor(
    private readonly appConfig: ConfigService,
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  isEnabled(): boolean {
    return Boolean(
      this.appConfig.get('OIDC_ISSUER_URL')?.trim() &&
        this.appConfig.get('OIDC_CLIENT_ID')?.trim() &&
        this.appConfig.get('OIDC_CLIENT_SECRET')?.trim(),
    );
  }

  private async getConfiguration(): Promise<client.Configuration> {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException('OIDC is not configured on this API host');
    }
    if (!this.configPromise) {
      const issuer = this.appConfig.getOrThrow<string>('OIDC_ISSUER_URL').trim();
      const clientId = this.appConfig.getOrThrow<string>('OIDC_CLIENT_ID').trim();
      const clientSecret = this.appConfig.getOrThrow<string>('OIDC_CLIENT_SECRET').trim();
      this.configPromise = client.discovery(new URL(issuer), clientId, clientSecret);
    }
    return this.configPromise;
  }

  async getLoginRedirectUrl(): Promise<string> {
    const cfg = await this.getConfiguration();
    const redirectUri = this.appConfig.getOrThrow<string>('OIDC_REDIRECT_URI').trim();
    const state = crypto.randomBytes(24).toString('hex');
    pendingStates.set(state, Date.now() + STATE_TTL_MS);
    return client.buildAuthorizationUrl(cfg, {
      redirect_uri: redirectUri,
      scope: this.appConfig.get<string>('OIDC_SCOPES') ?? 'openid email profile',
      state,
    }).href;
  }

  async handleCallback(code: string, state: string): Promise<{ accessToken: string; redirectUrl: string }> {
    const exp = pendingStates.get(state);
    pendingStates.delete(state);
    if (!exp || exp < Date.now()) {
      throw new BadRequestException('Invalid or expired OIDC state');
    }

    const cfg = await this.getConfiguration();
    const redirectUri = this.appConfig.getOrThrow<string>('OIDC_REDIRECT_URI').trim();
    const callbackUrl = new URL(redirectUri);
    callbackUrl.searchParams.set('code', code);
    callbackUrl.searchParams.set('state', state);
    const tokenSet = await client.authorizationCodeGrant(cfg, callbackUrl, {
      expectedState: state,
    });

    const claims = tokenSet.claims();
    if (!claims) {
      throw new BadRequestException('OIDC token missing ID token claims');
    }
    const email = String(claims.email ?? '').toLowerCase().trim();
    if (!email) {
      throw new BadRequestException('OIDC token missing email claim');
    }

    const role = this.mapRole(claims as Record<string, unknown>);
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      const passwordHash = await this.auth.hashForOidcProvision();
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          role,
          profile: { create: { fullName: String(claims.name ?? email), setupCompleted: true } },
        },
      });
      this.logger.log(`OIDC provisioned user ${email} role=${role}`);
    } else if (user.role !== role && this.isElevated(role)) {
      await this.prisma.user.update({ where: { id: user.id }, data: { role } });
      user = { ...user, role };
    }

    const accessToken = await this.auth.issueAccessTokenForUser(user.id, user.email, user.role);
    const adminWeb = this.appConfig.get<string>('ADMIN_WEB_URL')?.replace(/\/$/, '') ?? 'http://localhost:3000';
    const target = role === UserRole.RESPONDER ? 'responder' : 'ops';
    const redirectUrl = `${adminWeb}/auth/handoff?target=${target}#t=${encodeURIComponent(accessToken)}`;
    return { accessToken, redirectUrl };
  }

  private mapRole(claims: Record<string, unknown>): UserRole {
    const groups = claims.groups ?? claims.roles ?? claims.realm_access;
    const raw = JSON.stringify(groups).toUpperCase();
    if (raw.includes('SUPER_ADMIN')) return UserRole.SUPER_ADMIN;
    if (raw.includes('ADMIN')) return UserRole.ADMIN;
    if (raw.includes('AUDITOR')) return 'AUDITOR' as UserRole;
    if (raw.includes('OPERATOR')) return UserRole.OPERATOR;
    if (raw.includes('RESPONDER')) return UserRole.RESPONDER;
    const mapped = this.appConfig.get<string>('OIDC_DEFAULT_ROLE')?.trim();
    if (mapped && mapped in UserRole) return mapped as UserRole;
    return UserRole.OPERATOR;
  }

  private isElevated(role: UserRole): boolean {
    return (
      role === UserRole.ADMIN ||
      role === UserRole.SUPER_ADMIN ||
      (role as string) === 'AUDITOR'
    );
  }
}
