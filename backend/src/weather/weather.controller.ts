import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { WeatherService } from './weather.service';

const EOC_WEATHER_ROLES = [
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.OPERATOR,
  UserRole.RESPONDER,
  UserRole.CITIZEN,
  UserRole.BARANGAY_CHAIRMAN,
  'AUDITOR' as UserRole,
];

@Controller('weather')
export class WeatherController {
  constructor(private readonly weather: WeatherService) {}

  /**
   * EOC weather desk bundle: Open-Meteo situation, PAGASA RSS advisories, OpenWeatherMap tile layers.
   */
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...EOC_WEATHER_ROLES)
  @Get()
  eocBundle() {
    return this.weather.getEocWeatherBundle();
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('alerts')
  alerts(): { source: string; message: string; integrated: boolean } {
    return {
      source: 'integrated',
      message: 'Use GET /weather for EOC bundle (Open-Meteo + PAGASA RSS + OWM layers).',
      integrated: true,
    };
  }

  @Throttle({ default: { limit: 45, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...EOC_WEATHER_ROLES)
  @Get('situation')
  situation() {
    return this.weather.getSituationSnapshot();
  }
}
