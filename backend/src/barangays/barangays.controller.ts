import { Controller, Get, UseGuards } from '@nestjs/common';
import { BarangaysService } from './barangays.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('barangays')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BarangaysController {
  constructor(private readonly barangays: BarangaysService) {}

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR)
  @Get('stats/user-counts')
  userCounts() {
    return this.barangays.userCountsByBarangay();
  }

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
