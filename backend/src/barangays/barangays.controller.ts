import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { BarangaysService } from './barangays.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { UpdateBarangayOpsHazardDto } from './dto/update-barangay-ops-hazard.dto';

function clientMeta(req: Request): { ip?: string; ua?: string } {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : req.ip;
  const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
  return { ip, ua };
}

/**
 * Public `GET /barangays/public` lives here (no JWT) so it cannot lose to another
 * controller on the same prefix. Authenticated routes use per-method guards.
 */
@Controller('barangays')
export class BarangaysController {
  constructor(private readonly barangays: BarangaysService) {}

  @Get('public')
  listPublic() {
    return this.barangays.listPublic();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR)
  @Get('stats/user-counts')
  userCounts() {
    return this.barangays.userCountsByBarangay();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.OPERATOR,
    UserRole.RESPONDER,
    UserRole.CITIZEN,
    UserRole.BARANGAY_CHAIRMAN,
    UserRole.PNP,
    UserRole.BFP,
  )
  @Get()
  list() {
    return this.barangays.list();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR)
  @Patch(':id/ops-hazard')
  updateOpsHazard(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBarangayOpsHazardDto,
    @Req() req: Request,
  ) {
    return this.barangays.updateOpsHazard(actor, id, dto, clientMeta(req));
  }
}
