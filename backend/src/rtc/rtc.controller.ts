import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RtcService } from './rtc.service';

@Controller('rtc')
@UseGuards(JwtAuthGuard)
export class RtcController {
  constructor(private readonly rtc: RtcService) {}

  /** ICE (STUN + optional TURN) for WebRTC voice — any authenticated role. */
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get('ice')
  ice() {
    return this.rtc.getIceServers();
  }
}
