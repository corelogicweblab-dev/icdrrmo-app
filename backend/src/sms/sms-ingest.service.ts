import {
  Injectable,
  Logger,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SmsParserService } from './sms-parser.service';
import { IncidentsService } from '../incidents/incidents.service';

@Injectable()
export class SmsIngestService {
  private readonly logger = new Logger(SmsIngestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: SmsParserService,
    private readonly incidents: IncidentsService,
    private readonly config: ConfigService,
  ) {}

  verifySignature(signature: string | undefined, rawBody: string): void {
    const secret = this.config.get<string>('SMS_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.error('SMS_WEBHOOK_SECRET not configured');
      throw new UnauthorizedException('SMS ingest disabled');
    }
    if (!signature) {
      throw new UnauthorizedException('Missing signature');
    }
    const expected = createHash('sha256').update(`${secret}:${rawBody}`).digest('hex');
    const a = Buffer.from(signature, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid signature');
    }
  }

  async ingest(fromPhone: string, body: string): Promise<{ incidentId: string }> {
    const payloadHash = createHash('sha256').update(`${fromPhone}:${body}`).digest('hex');
    const existing = await this.prisma.smsIngress.findUnique({
      where: { payloadHash },
    });
    if (existing?.processed && existing.incidentId) {
      return { incidentId: existing.incidentId };
    }
    let parsed;
    try {
      parsed = this.parser.parseSosBody(body);
    } catch (e) {
      this.logger.warn(`SMS parse failed: ${String(e)}`);
      throw new UnprocessableEntityException('Invalid SOS payload');
    }
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ id: parsed.userId }, { phone: fromPhone }] },
      select: { id: true },
    });
    if (!user || user.id !== parsed.userId) {
      this.logger.warn(`SMS user mismatch from=${fromPhone} claimed=${parsed.userId}`);
      throw new UnprocessableEntityException('User verification failed');
    }
    await this.prisma.smsIngress.upsert({
      where: { payloadHash },
      create: {
        fromPhone,
        body,
        payloadHash,
        processed: false,
      },
      update: { fromPhone, body },
    });
    const result = await this.incidents.createFromSms({
      reporterId: user.id,
      type: parsed.type,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      battery: parsed.battery,
      rawBody: body,
    });
    await this.prisma.smsIngress.update({
      where: { payloadHash },
      data: { processed: true, incidentId: result.incidentId },
    });
    return result;
  }
}
