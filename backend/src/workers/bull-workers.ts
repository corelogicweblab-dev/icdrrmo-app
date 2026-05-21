/**
 * Processes BullMQ jobs for notification fan-out and outbound SMS retries.
 * Run alongside API: npm run worker:bull (needs REDIS_URL + DATABASE_URL).
 */
import { Worker, type Job } from 'bullmq';
import { PrismaClient, NotificationType } from '@prisma/client';
import type {
  IncidentNotifyJobData,
  SmsRetryJobData,
} from '../jobs/jobs.service';
import { sendOutboundSms } from '../communications/sms-sender';

const NOTIFICATION_FANOUT = 'notification-fanout';
const SMS_RETRY = 'sms-retry';

async function main(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl?.trim()) {
    // eslint-disable-next-line no-console
    console.error('REDIS_URL is required to run Bull workers.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const smsOutbound = (prisma as unknown as { smsOutboundLog: {
    update: (args: unknown) => Promise<unknown>;
  } }).smsOutboundLog;
  const connection = { url: redisUrl };

  new Worker<IncidentNotifyJobData>(
    NOTIFICATION_FANOUT,
    async (job: Job<IncidentNotifyJobData>) => {
      const d = job.data;
      if (!d.reporterId) {
        // eslint-disable-next-line no-console
        console.log(`[${NOTIFICATION_FANOUT}] skip — no reporter incident=${d.incidentId}`);
        return;
      }
      const short = `${d.incidentId.slice(0, 8)}…`;
      const body =
        d.status === d.previousStatus
          ? `ICDRRMO dispatcher ping: incident ${short} — status ${d.status}.`
          : `Incident ${short} is now ${d.status} (was ${d.previousStatus}).`;
      await prisma.notification.create({
        data: {
          userId: d.reporterId,
          title: 'Incident status update',
          body,
          type: NotificationType.RESPONDER_UPDATE,
          payload: {
            incidentId: d.incidentId,
            previousStatus: d.previousStatus,
            status: d.status,
          },
        },
      });
      // eslint-disable-next-line no-console
      console.log(
        `[${NOTIFICATION_FANOUT}] notification row user=${d.reporterId} job=${job.id}`,
      );
    },
    { connection },
  );

  new Worker<SmsRetryJobData>(
    SMS_RETRY,
    async (job: Job<SmsRetryJobData>) => {
      const d = job.data;
      const phone = d.toPhone?.trim();
      if (!phone) {
        if (d.logId) {
          await smsOutbound.update({
            where: { id: d.logId },
            data: {
              status: 'FAILED',
              lastError: 'No destination phone',
              attempts: { increment: 1 },
            },
          });
        }
        return;
      }

      const { ok, response } = await sendOutboundSms(phone, d.message);
      if (d.logId) {
        await smsOutbound.update({
          where: { id: d.logId },
          data: {
            status: ok ? 'SENT' : 'FAILED',
            gatewayResponse: response,
            lastError: ok ? null : response,
            sentAt: ok ? new Date() : undefined,
            attempts: { increment: 1 },
            jobId: job.id ?? null,
          },
        });
      }
      // eslint-disable-next-line no-console
      console.log(
        `[${SMS_RETRY}] ${ok ? 'sent' : 'failed'} phone=${phone} incident=${d.incidentId ?? '—'} job=${job.id}`,
      );
    },
    { connection },
  );

  // eslint-disable-next-line no-console
  console.log(`BullMQ workers listening: ${NOTIFICATION_FANOUT}, ${SMS_RETRY}`);
}

void main();
