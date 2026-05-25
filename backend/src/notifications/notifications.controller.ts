import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateAdminNotificationDto } from './dto/create-admin-notification.dto';
import { CreateBarangayAlertDto } from './dto/create-barangay-alert.dto';

function clientMeta(req: Request): { ip?: string; ua?: string } {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : req.ip;
  const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
  return { ip, ua };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('me')
  listMine(@CurrentUser() user: JwtPayload) {
    return this.notifications.listForUser(user.sub);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR)
  @Get()
  list() {
    return this.notifications.listRecent();
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('broadcast')
  broadcast(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: CreateAdminNotificationDto,
    @Req() req: Request,
  ) {
    return this.notifications.broadcast(actor, dto, clientMeta(req));
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR)
  @Post('barangay-alert')
  publishBarangayAlert(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: CreateBarangayAlertDto,
    @Req() req: Request,
  ) {
    return this.notifications.publishBarangayAlert(actor, dto, clientMeta(req));
  }
}
