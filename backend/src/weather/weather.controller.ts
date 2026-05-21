import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { WeatherService } from './weather.service';
import { WeatherGeojsonMergeService } from './weather-geojson-merge.service';
import { WindyTilesService } from './windy-tiles.service';

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
  constructor(
    private readonly weather: WeatherService,
    private readonly geoMerge: WeatherGeojsonMergeService,
    private readonly windyTiles: WindyTilesService,
  ) {}

  /**
   * Public Windy layer catalog — URLs point at ICDRRMO tile proxy (no embed / no on-map Windy logo).
   * Requires WINDY_API_KEY on the API service.
   */
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get('tiles/layers')
  windyTileLayers() {
    return this.windyTiles.getPublicLayers();
  }

  /** Proxies Windy raster tiles server-side so the browser never loads windy.com embed assets. */
  @Throttle({ default: { limit: 600, ttl: 60_000 } })
  @Get('tiles/:layer/:z/:x/:y.png')
  @Header('Cache-Control', 'public, max-age=300')
  async windyTileProxy(
    @Param('layer') layer: string,
    @Param('z') z: string,
    @Param('x') x: string,
    @Param('y') y: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!/^\d+$/.test(z) || !/^\d+$/.test(x) || !/^\d+$/.test(y)) {
      throw new NotFoundException('Invalid tile coordinates');
    }
    const url = this.windyTiles.upstreamTileUrl(layer, z, x, y);
    const upstream = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!upstream.ok) {
      throw new NotFoundException('Upstream weather tile unavailable');
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'image/png');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(buf);
  }

  /**
   * EOC weather desk bundle: Open-Meteo situation, PAGASA RSS advisories, OpenWeatherMap tile layers.
   */
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...EOC_WEATHER_ROLES)
  @Get()
  async eocBundle() {
    const [bundle, hazardGeo] = await Promise.all([
      this.weather.getEocWeatherBundle(),
      this.geoMerge.buildMergedGeoJson(),
    ]);
    return { ...bundle, hazardGeo };
  }

  /**
   * Merged hazard layers as GeoJSON: OWM raster tile AOI, GDACS GeoRSS alerts, PAGASA portal + RSS advisories.
   */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...EOC_WEATHER_ROLES)
  @Get('geojson')
  geojson() {
    return this.geoMerge.buildMergedGeoJson();
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('alerts')
  alerts(): { source: string; message: string; integrated: boolean; geojsonPath: string } {
    return {
      source: 'integrated',
      message:
        'Use GET /weather/geojson for merged GeoJSON (OWM tiles + GDACS + PAGASA). Legacy bundle: GET /weather.',
      integrated: true,
      geojsonPath: '/api/v1/weather/geojson',
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
