import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { resolveWindyApiKey } from '../weather/windy-tiles.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Lightweight — orchestrator / uptime probes (no DB). */
  @Get()
  check(): { status: string; service: string; windyTiles: boolean } {
    return {
      status: 'ok',
      service: 'icdrrmo-api',
      windyTiles: Boolean(resolveWindyApiKey()),
    };
  }

  /** Readiness — requires working PostgreSQL connection. */
  @Get('ready')
  async ready(
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ status: string; service: string; database: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', service: 'icdrrmo-api', database: 'connected' };
    } catch {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
      return { status: 'error', service: 'icdrrmo-api', database: 'disconnected' };
    }
  }
}
