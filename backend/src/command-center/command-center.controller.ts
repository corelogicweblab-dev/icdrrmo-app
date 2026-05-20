import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { OPS_DESK_READ_ROLES } from '../common/ops-desk-roles';
import { CommandCenterService } from './command-center.service';

@Controller('command-center')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommandCenterController {
  constructor(private readonly desk: CommandCenterService) {}

  @Roles(...OPS_DESK_READ_ROLES)
  @Get('snapshot')
  snapshot(@CurrentUser() user: JwtPayload) {
    return this.desk.snapshot(user);
  }

  @Roles(...OPS_DESK_READ_ROLES)
  @Get('dispatch/suggestions')
  dispatchSuggestions(
    @CurrentUser() user: JwtPayload,
    @Query('incidentId') incidentId: string,
  ) {
    return this.desk.dispatchSuggestions(user, incidentId);
  }

  @Roles(...OPS_DESK_READ_ROLES)
  @Post('nlp/classify')
  classify(@Body() body: { text?: string }) {
    return this.desk.classifyReportText(body?.text ?? '');
  }
}
