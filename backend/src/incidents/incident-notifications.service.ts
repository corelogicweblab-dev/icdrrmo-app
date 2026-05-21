import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmergencyType, NotificationType, RoutedAgency, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CommunicationsService } from '../communications/communications.service';
import { PushService } from '../push/push.service';
import { resolveRoutedAgency, routedAgencyLabel } from './incident-routing';

function parsePhoneList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseEmailList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((e) => e.includes('@'));
}

@Injectable()
export class IncidentNotificationsService {
  private readonly log = new Logger(IncidentNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communications: CommunicationsService,
    private readonly push: PushService,
    private readonly config: ConfigService,
  ) {}

  private agencySmsEnvKey(agency: RoutedAgency): string {
    switch (agency) {
      case RoutedAgency.BFP:
        return 'AGENCY_BFP_SMS_PHONES';
      case RoutedAgency.PNP:
        return 'AGENCY_PNP_SMS_PHONES';
      case RoutedAgency.ICDRRMO_MEDICAL:
        return 'AGENCY_ICDRRMO_MEDICAL_SMS_PHONES';
      case RoutedAgency.ICDRRMO_OPS:
        return 'AGENCY_ICDRRMO_OPS_SMS_PHONES';
      default:
        return 'AGENCY_ICDRRMO_OPS_SMS_PHONES';
    }
  }

  private agencyEmailEnvKey(agency: RoutedAgency): string {
    switch (agency) {
      case RoutedAgency.BFP:
        return 'AGENCY_BFP_EMAILS';
      case RoutedAgency.PNP:
        return 'AGENCY_PNP_EMAILS';
      case RoutedAgency.ICDRRMO_MEDICAL:
        return 'AGENCY_ICDRRMO_MEDICAL_EMAILS';
      case RoutedAgency.ICDRRMO_OPS:
        return 'AGENCY_ICDRRMO_OPS_EMAILS';
      default:
        return 'AGENCY_ICDRRMO_OPS_EMAILS';
    }
  }

  private async sendEmailInternal(to: string, subject: string, text: string): Promise<void> {
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT', '587'));
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const from = this.config.get<string>('ALERT_EMAIL_FROM');
    if (!host || !from) return;
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
    await transporter.sendMail({ from, to, subject, text });
  }

  /** Citizen confirmation + agency alerts after a new incident is stored. */
  async notifyOnIncidentCreated(params: {
    incidentId: string;
    type: EmergencyType;
    routedAgency: RoutedAgency;
    reporterId: string | null;
    latitude: number;
    longitude: number;
    barangayId: string | null;
  }): Promise<void> {
    const agencyName = routedAgencyLabel(params.routedAgency);
    const shortId = params.incidentId.slice(0, 8);
    const coords = `${params.latitude.toFixed(5)}, ${params.longitude.toFixed(5)}`;

    if (params.reporterId) {
      const reporter = await this.prisma.user.findUnique({
        where: { id: params.reporterId },
        select: { id: true, email: true, phone: true },
      });
      if (reporter) {
        const confirmBody = `ICDRRMO received your ${params.type.replace(/_/g, ' ')} report (${shortId}). Routed to ${agencyName}. Help is being coordinated.`;
        await this.prisma.notification.create({
          data: {
            userId: reporter.id,
            title: 'SOS received',
            body: confirmBody,
            type: NotificationType.EMERGENCY_ALERT,
            payload: {
              incidentId: params.incidentId,
              routedAgency: params.routedAgency,
            },
          },
        });
        void this.push.sendToUserIds(
          [reporter.id],
          'SOS received',
          confirmBody,
          { incidentId: params.incidentId, routedAgency: params.routedAgency },
          'emergency',
        );
        if (reporter.phone?.trim()) {
          void this.communications.queueOutboundSms({
            incidentId: params.incidentId,
            toPhone: reporter.phone.trim(),
            message: confirmBody,
          });
        }
        if (reporter.email?.includes('@')) {
          void this.sendEmailInternal(
            reporter.email,
            `ICDRRMO SOS confirmation — ${shortId}`,
            `${confirmBody}\n\nLocation: ${coords}\nReference: ${params.incidentId}`,
          ).catch((e) =>
            this.log.warn(`Citizen email skipped: ${e instanceof Error ? e.message : e}`),
          );
        }
      }
    }

    const agencyMsg = `ICDRRMO ALERT [${params.routedAgency}] ${params.type} incident ${shortId} at ${coords}. ID ${params.incidentId}.`;
    const phones = parsePhoneList(this.config.get<string>(this.agencySmsEnvKey(params.routedAgency)));
    for (const phone of phones) {
      void this.communications.queueOutboundSms({
        incidentId: params.incidentId,
        toPhone: phone,
        message: agencyMsg,
      });
    }
    const emails = parseEmailList(this.config.get<string>(this.agencyEmailEnvKey(params.routedAgency)));
    for (const email of emails) {
      void this.sendEmailInternal(
        email,
        `ICDRRMO — ${params.routedAgency} queue — ${shortId}`,
        agencyMsg,
      ).catch((e) => this.log.warn(`Agency email ${email}: ${e instanceof Error ? e.message : e}`));
    }

    if (params.routedAgency === RoutedAgency.ICDRRMO_MEDICAL) {
      const responderWhere = params.barangayId
        ? { role: UserRole.RESPONDER, profile: { barangayId: params.barangayId } }
        : { role: UserRole.RESPONDER };
      const medicalResponders = await this.prisma.user.findMany({
        where: responderWhere,
        select: { id: true },
        take: 80,
      });
      const ids = medicalResponders.map((u) => u.id);
      if (ids.length > 0) {
        void this.push.sendToUserIds(
          ids,
          'Medical SOS dispatch',
          agencyMsg,
          { incidentId: params.incidentId, type: params.type },
          'emergency',
        );
      }
    }
  }

  routedAgencyForType(type: EmergencyType): RoutedAgency {
    return resolveRoutedAgency(type);
  }
}
