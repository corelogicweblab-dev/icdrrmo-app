import { Controller, Get, UseGuards } from '@nestjs/common';
import { BarangaysService } from './barangays.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

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
  )
  @Get()
  list() {
    return this.barangays.list();
  }
}
