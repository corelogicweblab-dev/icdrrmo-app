import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

/**
 * Placeholder for PAGASA / Open-Meteo / PHIVOLCS / RainViewer aggregation.
 * Wire scheduled jobs + cache (Redis) in a follow-up iteration.
 */
@Controller('weather')
export class WeatherController {
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('alerts')
  alerts(): { source: string; message: string; integrated: boolean } {
    return {
      source: 'service_ready',
      message:
        'Hazard feeds (PAGASA, Open-Meteo, PHIVOLCS, RainViewer) connect here when ingest workers are enabled.',
      integrated: false,
    };
  }
}
