import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { JobsService } from '../jobs/jobs.service';
import { CommunicationsService } from '../communications/communications.service';
import { AuditLogService } from '../audit/audit-log.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { Prisma } from '@prisma/client';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly jobs: JobsService,
    private readonly communications: CommunicationsService,
    private readonly audit: AuditLogService,
  ) {}

  async sendSms(
    actor: JwtPayload,
    dto: { toPhone: string; message: string },
    meta: { ip?: string; ua?: string },
  ): Promise<{ queued: boolean; note?: string }> {
    await this.communications.queueOutboundSms({
      incidentId: null,
      toPhone: dto.toPhone,
      message: dto.message,
    });
    const queued = Boolean(this.jobs.smsRetry);
    await this.audit.write({
      actorId: actor.sub,
      action: 'alert_sms_enqueue',
      entityType: 'Alert',
      entityId: null,
      metadata: { toPhone: dto.toPhone.slice(0, 6) + '…', queued } as Prisma.InputJsonValue,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return {
      queued,
      note: queued ? undefined : 'REDIS_URL unset — SMS job not queued (configure Redis + worker).',
    };
  }

  async sendEmail(
    actor: JwtPayload,
    dto: { to: string; subject: string; text: string },
    meta: { ip?: string; ua?: string },
  ): Promise<{ sent: boolean; messageId?: string; note?: string }> {
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT', '587'));
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const from = this.config.get<string>('ALERT_EMAIL_FROM');
    if (!host || !from) {
      this.logger.warn('SMTP_HOST or ALERT_EMAIL_FROM unset — email alert skipped');
      await this.audit.write({
        actorId: actor.sub,
        action: 'alert_email_skipped',
        entityType: 'Alert',
        entityId: null,
        metadata: { reason: 'smtp_not_configured' } as Prisma.InputJsonValue,
        ipAddress: meta.ip,
        userAgent: meta.ua,
      });
      return { sent: false, note: 'Set SMTP_HOST, SMTP_PORT, ALERT_EMAIL_FROM, and optionally SMTP_USER/SMTP_PASS.' };
    }
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
    try {
      const info = await transporter.sendMail({
        from,
        to: dto.to,
        subject: dto.subject,
        text: dto.text,
      });
      await this.audit.write({
        actorId: actor.sub,
        action: 'alert_email_sent',
        entityType: 'Alert',
        entityId: null,
        metadata: { to: dto.to, messageId: info.messageId } as Prisma.InputJsonValue,
        ipAddress: meta.ip,
        userAgent: meta.ua,
      });
      return { sent: true, messageId: info.messageId };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'send failed';
      this.logger.error(`Email send failed: ${msg}`);
      throw new ServiceUnavailableException(`Email transport error: ${msg}`);
    }
  }
}
