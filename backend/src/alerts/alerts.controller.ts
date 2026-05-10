import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { AlertSmsDto } from './dto/alert-sms.dto';
import { AlertEmailDto } from './dto/alert-email.dto';

function clientMeta(req: Request): { ip?: string; ua?: string } {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : req.ip;
  const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
  return { ip, ua };
}

@Controller('alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('sms')
  sms(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: AlertSmsDto,
    @Req() req: Request,
  ) {
    return this.alerts.sendSms(actor, dto, clientMeta(req));
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('email')
  email(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: AlertEmailDto,
    @Req() req: Request,
  ) {
    return this.alerts.sendEmail(actor, dto, clientMeta(req));
  }
}
