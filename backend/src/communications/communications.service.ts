import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
@Injectable()
export class CommunicationsService {
  /** Prisma delegate — available after `prisma migrate` + `prisma generate`. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get smsOutbound(): any {
    return (this.prisma as unknown as { smsOutboundLog: unknown }).smsOutboundLog;
  }
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
  ) {}

  async listSmsIngress(take = 50) {
    return this.prisma.smsIngress.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: { incident: { select: { id: true, type: true, status: true } } },
    });
  }

  async listSmsOutbound(take = 50) {
    return this.smsOutbound.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: { incident: { select: { id: true, type: true } } },
    });
  }

  async listVoiceCalls(take = 50) {
    return this.prisma.voiceCallLog.findMany({
      orderBy: { startedAt: 'desc' },
      take,
      include: {
        incident: { select: { id: true, type: true } },
        initiator: { select: { email: true } },
        participant: { select: { email: true } },
      },
    });
  }

  async queueOutboundSms(params: {
    incidentId?: string | null;
    toPhone: string;
    message: string;
    jobId?: string;
  }) {
    const log = await this.smsOutbound.create({
      data: {
        incidentId: params.incidentId ?? null,
        toPhone: params.toPhone,
        message: params.message,
        status: 'QUEUED',
        jobId: params.jobId ?? null,
      },
    });
    await this.jobs.enqueueSmsRetry({
      logId: log.id,
      incidentId: params.incidentId ?? null,
      toPhone: params.toPhone,
      message: params.message,
    });
    return log;
  }
}
