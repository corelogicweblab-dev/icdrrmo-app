import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { OPS_DESK_READ_ROLES } from '../common/ops-desk-roles';
import { CommandCenterService } from '../command-center/command-center.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly commandCenter: CommandCenterService,
  ) {}

  @Roles(...OPS_DESK_READ_ROLES)
  @Get('summary')
  summary(@CurrentUser() actor: JwtPayload) {
    return this.dashboard.summary(actor);
  }

  /** Alias for clients when `/command-center/snapshot` is not yet deployed. */
  @Roles(...OPS_DESK_READ_ROLES)
  @Get('command-center-snapshot')
  commandCenterSnapshot(@CurrentUser() actor: JwtPayload) {
    return this.commandCenter.snapshot(actor);
  }

  @Roles(...OPS_DESK_READ_ROLES)
  @Get('dispatch/suggestions')
  dispatchSuggestions(
    @CurrentUser() actor: JwtPayload,
    @Query('incidentId') incidentId: string,
  ) {
    return this.commandCenter.dispatchSuggestions(actor, incidentId);
  }
}
