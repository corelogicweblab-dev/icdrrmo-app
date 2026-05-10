import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weather: WeatherService) {}

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('alerts')
  alerts(): { source: string; message: string; integrated: boolean } {
    return {
      source: 'service_ready',
      message:
        'Use GET /weather/situation (auth) for live Open‑Meteo + Isabela hazard reference. PAGASA / PHIVOLCS ingest can extend this service later.',
      integrated: true,
    };
  }

  /** Live model rain + Isabela City hazard reference (barangay-level planning list). */
  @Throttle({ default: { limit: 45, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR)
  @Get('situation')
  situation() {
    return this.weather.getSituationSnapshot();
  }
}
