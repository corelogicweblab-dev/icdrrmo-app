import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, type ConnectionOptions } from 'bullmq';

const SMS_RETRY = 'sms-retry';
const NOTIFICATION_FANOUT = 'notification-fanout';
const LOCATION_BATCH = 'location-batch';

export type IncidentNotifyJobData = {
  incidentId: string;
  reporterId: string | null;
  status: string;
  previousStatus: string;
};

export type SmsRetryJobData = {
  logId?: string;
  incidentId: string | null;
  toPhone: string | null;
  message: string;
};

/**
 * BullMQ queues for background reliability: SMS retries, push fan-out, batched GPS writes.
 * Workers run in a separate process / container in production.
 */
@Injectable()
export class JobsService implements OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  readonly smsRetry: Queue | undefined;
  readonly notificationFanout: Queue | undefined;
  readonly locationBatch: Queue | undefined;

  constructor(private readonly config: ConfigService) {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.warn('REDIS_URL unset — BullMQ queues disabled (single-node dev OK)');
      return;
    }
    const connection: ConnectionOptions = { url };
    this.smsRetry = new Queue(SMS_RETRY, { connection });
    this.notificationFanout = new Queue(NOTIFICATION_FANOUT, { connection });
    this.locationBatch = new Queue(LOCATION_BATCH, { connection });
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(
      [this.smsRetry, this.notificationFanout, this.locationBatch]
        .filter((q): q is Queue => Boolean(q))
        .map((q) => q.close()),
    );
  }

  /** In-app notification row + future push fan-out (processed by `notification-fanout` worker). */
  async enqueueIncidentNotify(data: IncidentNotifyJobData): Promise<void> {
    if (!this.notificationFanout) {
      this.logger.debug('notification-fanout queue disabled — skip incident notify job');
      return;
    }
    await this.notificationFanout.add('incident-update', data, {
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }

  /** Outbound SMS reliability queue (processed by `sms-retry` worker). */
  async enqueueSmsRetry(data: SmsRetryJobData): Promise<void> {
    if (!this.smsRetry) {
      this.logger.debug('sms-retry queue disabled — skip SMS job');
      return;
    }
    await this.smsRetry.add('outbound-status', data, {
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }
}
