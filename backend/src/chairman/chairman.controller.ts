import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { ChairmanService } from './chairman.service';
import { ChairmanIncidentActionDto } from './dto/chairman-incident-action.dto';

function clientMeta(req: Request): { ip?: string; ua?: string } {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : req.ip;
  const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
  return { ip, ua };
}

@Controller('chairman')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BARANGAY_CHAIRMAN)
export class ChairmanController {
  constructor(private readonly chairman: ChairmanService) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: JwtPayload) {
    return this.chairman.getDashboard(user);
  }

  @Get('incidents')
  incidents(@CurrentUser() user: JwtPayload) {
    return this.chairman.listIncidents(user);
  }

  @Get('incidents/:id')
  incident(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.chairman.getIncident(user, id);
  }

  @Post('incidents/:id/action')
  incidentAction(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ChairmanIncidentActionDto,
    @Req() req: Request,
  ) {
    return this.chairman.applyAction(user, id, dto, clientMeta(req));
  }

  @Get('audit-logs')
  auditLogs(@CurrentUser() user: JwtPayload) {
    return this.chairman.listAuditLogs(user);
  }

  @Get('system-health')
  systemHealth(@CurrentUser() user: JwtPayload) {
    return this.chairman.getSystemHealth(user);
  }

  @Post('me/device-token')
  registerDevice(
    @CurrentUser() user: JwtPayload,
    @Body() body: { token: string; platform?: string },
  ) {
    if (!body?.token?.trim()) {
      return { ok: false, message: 'token required' };
    }
    return this.chairman.registerDeviceToken(
      user,
      body.token.trim(),
      body.platform ?? 'WEB',
    );
  }
}
