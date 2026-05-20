import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateSosDto } from './dto/create-sos.dto';
import { PatchIncidentDto } from './dto/patch-incident.dto';
import { CreateOpsIncidentDto } from './dto/create-ops-incident.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { OPS_DESK_READ_ROLES } from '../common/ops-desk-roles';

@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidents: IncidentsService) {}

  /** No auth — documents real routes (avoids “empty 404” on GET /incidents). */
  @Get()
  info(): { service: string; endpoints: Record<string, string> } {
    return {
      service: 'incidents',
      endpoints: {
        sos: 'POST /api/v1/incidents/sos (JWT: citizen or app user)',
        queue: 'GET /api/v1/incidents/queue (JWT: admin | super_admin | operator)',
        patch: 'PATCH /api/v1/incidents/:id (ops roles)',
        opsCreate: 'POST /api/v1/incidents/ops (ops roles)',
        responders:
          'GET /api/v1/incidents/responders-assignable (ops roles)',
        users: 'CRUD /api/v1/users (ADMIN | SUPER_ADMIN)',
        vehicles: 'CRUD /api/v1/vehicles',
        respondersAdmin: 'CRUD /api/v1/responders',
        barangays: 'GET /api/v1/barangays + /barangays/stats/user-counts',
        evacuationCenters:
          'CRUD /api/v1/evacuation-centers (ADMIN | SUPER_ADMIN | OPERATOR; operators scoped to profile barangay)',
        notifications: 'GET /api/v1/notifications + POST /notifications/broadcast',
        auditLogs: 'GET /api/v1/audit-logs',
        map: 'GET /api/v1/map/ops-live',
        dashboard: 'GET /api/v1/dashboard/summary',
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('sos')
  sos(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSosDto,
  ): Promise<{ incidentId: string; deduplicated: boolean }> {
    return this.incidents.createSosFromApp(user, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR)
  @Post('ops')
  createOps(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateOpsIncidentDto,
  ): Promise<{ id: string }> {
    return this.incidents.createByOps(user, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR)
  @Get('queue')
  queue(@CurrentUser() user: JwtPayload): Promise<unknown[]> {
    return this.incidents.listOpenForOps(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR)
  @Get('responders-assignable')
  respondersAssignable(
    @CurrentUser() user: JwtPayload,
  ): Promise<
    Array<{
      id: string;
      badgeNumber: string | null;
      status: string;
      email: string;
    }>
  > {
    return this.incidents.listAssignableResponders(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...OPS_DESK_READ_ROLES)
  @Get(':id/timeline')
  timeline(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.incidents.getTimeline(user, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR)
  @Patch(':id')
  patchIncident(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: PatchIncidentDto,
  ): Promise<unknown> {
    return this.incidents.patchIncidentForOps(user, id, dto);
  }
}
