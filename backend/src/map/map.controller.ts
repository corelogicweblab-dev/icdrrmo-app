import { Controller, Get, UseGuards } from '@nestjs/common';
import { MapService } from './map.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('map')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MapController {
  constructor(private readonly map: MapService) {}

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR)
  @Get('ops-live')
  opsLive() {
    return this.map.opsLiveContext();
  }
}
