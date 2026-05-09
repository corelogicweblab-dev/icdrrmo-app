import { Body, Controller, Ip, Post, Req, Headers } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<{ accessToken: string; refreshToken: string }> {
    return this.auth.register(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Req() req: Request,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp =
      typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : ip;
    return this.auth.login(dto, { ip: clientIp, userAgent });
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('refresh')
  refresh(
    @Body() dto: RefreshDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Req() req: Request,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp =
      typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : ip;
    return this.auth.refresh(dto.refreshToken, { ip: clientIp, userAgent });
  }
}
