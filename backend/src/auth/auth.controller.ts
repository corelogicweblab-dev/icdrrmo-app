import {
  Body,
  Controller,
  Get,
  Ip,
  Post,
  Query,
  Req,
  Res,
  Headers,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from './types/jwt-payload.type';
import { OidcAuthService } from './oidc-auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly oidc: OidcAuthService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<{ accessToken: string }> {
    return this.auth.register(dto);
  }

  /** Exchange Nest JWT for Firebase custom token (uid = user id) → Firestore client reads `citizen_profiles/{uid}`. */
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @Post('firebase-custom-token')
  firebaseCustomToken(@CurrentUser() user: JwtPayload): Promise<{ customToken: string }> {
    return this.auth.issueFirebaseCustomToken(user);
  }

  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ ok: true }> {
    return this.auth.changePassword(user.sub, dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Req() req: Request,
  ): Promise<{ accessToken: string }> {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp =
      typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : ip;
    return this.auth.login(dto, { ip: clientIp, userAgent });
  }

  @Get('oidc/login')
  async oidcLogin(@Res() res: Response): Promise<void> {
    const url = await this.oidc.getLoginRedirectUrl();
    res.redirect(url);
  }

  @Get('oidc/callback')
  async oidcCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ): Promise<void> {
    const { redirectUrl } = await this.oidc.handleCallback(code, state);
    res.redirect(redirectUrl);
  }

  @Get('oidc/status')
  oidcStatus(): { enabled: boolean } {
    return { enabled: this.oidc.isEnabled() };
  }
}
