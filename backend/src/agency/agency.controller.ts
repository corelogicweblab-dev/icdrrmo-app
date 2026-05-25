import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { OPS_DESK_WRITE_ROLES } from '../common/ops-desk-roles';
import { AgencyService } from './agency.service';
import { TriggerAgencyCallDto } from './dto/trigger-agency-call.dto';

@Controller('agency')
export class AgencyController {
  constructor(private readonly agency: AgencyService) {}

  @Get()
  info(): { service: string; endpoints: Record<string, string> } {
    return {
      service: 'agency',
      endpoints: {
        dashboard: 'GET /api/v1/agency/dashboard (JWT: PNP | BFP)',
        incidents: 'GET /api/v1/agency/incidents (JWT: PNP | BFP)',
        call: 'POST /api/v1/agency/call (JWT: ops write roles)',
        ack: 'POST /api/v1/agency/call/:callId/ack (JWT: PNP | BFP | BARANGAY_CHAIRMAN)',
      },
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PNP, UserRole.BFP)
  @Get('dashboard')
  dashboard(@CurrentUser() user: JwtPayload) {
    return this.agency.getDashboard(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PNP, UserRole.BFP)
  @Get('incidents')
  incidents(@CurrentUser() user: JwtPayload) {
    return this.agency.listIncidents(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...OPS_DESK_WRITE_ROLES)
  @Post('call')
  triggerCall(@CurrentUser() user: JwtPayload, @Body() dto: TriggerAgencyCallDto) {
    return this.agency.triggerCall(user, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PNP, UserRole.BFP, UserRole.BARANGAY_CHAIRMAN)
  @Post('call/:callId/ack')
  ackCall(@CurrentUser() user: JwtPayload, @Param('callId') callId: string) {
    return this.agency.acknowledgeCall(user, callId);
  }
}
