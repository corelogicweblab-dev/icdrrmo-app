import { Body, Controller, Headers, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InboundSmsDto } from './dto/inbound-sms.dto';
import { SmsIngestService } from './sms-ingest.service';

@Controller('sms')
export class SmsIngestController {
  constructor(private readonly sms: SmsIngestService) {}

  /** GSM gateway / Android relay posts JSON { from, body } with X-ICDRRMO-Signature */
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Post('inbound')
  inbound(
    @Body() dto: InboundSmsDto,
    @Headers('x-icdrrmo-signature') signature: string | undefined,
  ): Promise<{ incidentId: string }> {
    const signPayload = `${dto.from}|${dto.body}`;
    this.sms.verifySignature(signature, signPayload);
    return this.sms.ingest(dto.from, dto.body);
  }
}
