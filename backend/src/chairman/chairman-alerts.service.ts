import { Injectable, Logger } from '@nestjs/common';
import { NotificationType, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { JobsService } from '../jobs/jobs.service';
import { AuditLogService } from '../audit/audit-log.service';

export type ChairmanAlertIncident = {
  id: string;
  type: string;
  title: string | null;
  latitude: number;
  longitude: number;
  barangayId: string | null;
  createdAt: Date;
};

@Injectable()
export class ChairmanAlertsService {
  private readonly log = new Logger(ChairmanAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly jobs: JobsService,
    private readonly audit: AuditLogService,
  ) {}

  /** Notify all active barangay chairmen for this incident's barangay (first responders). */
  async notifyChairmenForIncident(incident: ChairmanAlertIncident): Promise<void> {
    const barangayId = incident.barangayId;
    if (!barangayId) {
      this.log.debug(`Incident ${incident.id} has no barangay — skip chairman alert`);
      return;
    }

    const chairmen = await this.prisma.user.findMany({
      where: {
        role: UserRole.BARANGAY_CHAIRMAN,
        isActive: true,
        profile: { barangayId },
      },
      select: { id: true, phone: true, email: true },
    });

    if (chairmen.length === 0) {
      this.log.warn(`No BARANGAY_CHAIRMAN users for barangay ${barangayId}`);
      return;
    }

    const barangay = await this.prisma.barangay.findUnique({
      where: { id: barangayId },
      select: { name: true, code: true },
    });
    const bgLabel = barangay?.name ?? 'your barangay';
    const title = `Emergency — ${incident.type.replace(/_/g, ' ')}`;
    const body = `${bgLabel}: new report at ${incident.latitude.toFixed(5)}, ${incident.longitude.toFixed(5)}. You are the designated first responder.`;

    const userIds = chairmen.map((c) => c.id);

    for (const uid of userIds) {
      await this.prisma.notification.create({
        data: {
          userId: uid,
          title,
          body,
          type: NotificationType.EMERGENCY_ALERT,
          payload: {
            incidentId: incident.id,
            barangayId,
            latitude: incident.latitude,
            longitude: incident.longitude,
            urgency: 'critical',
            role: 'barangay_chairman',
          },
        },
      });
    }

    const pushResult = await this.push.sendChairmanAlarm(userIds, title, body, {
      incidentId: incident.id,
      barangayId,
      latitude: String(incident.latitude),
      longitude: String(incident.longitude),
      type: incident.type,
      openRoute: '1',
      alarm: '1',
    });

    let smsQueued = 0;
    if (pushResult.tokensAttempted === 0 || pushResult.failure >= pushResult.success) {
      for (const c of chairmen) {
        if (!c.phone?.trim()) continue;
        await this.jobs.enqueueSmsRetry({
          incidentId: incident.id,
          toPhone: c.phone.trim(),
          message: `[ICDRRMO] ${title}. ${body} Open the chairman app immediately.`,
        });
        smsQueued += 1;
        await this.audit.write({
          actorId: null,
          action: 'chairman_alert_sms_fallback',
          entityType: 'incident',
          entityId: incident.id,
          metadata: { chairmanUserId: c.id, phone: c.phone },
        });
      }
    }

    await this.audit.write({
      actorId: null,
      action: 'chairman_emergency_alert_sent',
      entityType: 'incident',
      entityId: incident.id,
      metadata: {
        barangayId,
        chairmanCount: chairmen.length,
        push: pushResult,
        smsFallbackQueued: smsQueued,
      },
    });

    this.log.log(
      `Chairman alert incident=${incident.id} barangay=${barangayId} chairmen=${chairmen.length} pushTokens=${pushResult.tokensAttempted}`,
    );
  }
}
