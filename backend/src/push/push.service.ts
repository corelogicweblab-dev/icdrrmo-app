import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseAdminService } from '../firestore/firebase-admin.service';

export type PushChannel = 'weather' | 'emergency' | 'chairman_alarm';

const ANDROID_CHANNELS: Record<PushChannel, string> = {
  emergency: 'icd_emergency',
  weather: 'icd_weather',
  chairman_alarm: 'icd_chairman_alarm',
};

@Injectable()
export class PushService {
  private readonly log = new Logger(PushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseAdmin: FirebaseAdminService,
  ) {}

  private messaging(): admin.messaging.Messaging | null {
    if (!this.firebaseAdmin.isEnabled() || admin.apps.length === 0) {
      return null;
    }
    try {
      return admin.messaging();
    } catch (e) {
      this.log.warn(`FCM messaging unavailable: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }

  /**
   * High-priority FCM to all device tokens for the given users (chunks of 500).
   * No-op when Firebase Admin is not configured or there are no tokens.
   */
  async sendToUserIds(
    userIds: string[],
    title: string,
    body: string,
    data: Record<string, string>,
    channel: PushChannel,
  ): Promise<{ tokensAttempted: number; success: number; failure: number }> {
    const messaging = this.messaging();
    if (!messaging || userIds.length === 0) {
      return { tokensAttempted: 0, success: 0, failure: 0 };
    }

    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId: { in: userIds } },
      select: { token: true },
      distinct: ['token'],
    });
    const list = tokens.map((t) => t.token).filter(Boolean);
    if (list.length === 0) {
      this.log.debug('No device tokens for targeted users — skip FCM');
      return { tokensAttempted: 0, success: 0, failure: 0 };
    }

    let success = 0;
    let failure = 0;
    const chunkSize = 500;
    for (let i = 0; i < list.length; i += chunkSize) {
      const chunk = list.slice(i, i + chunkSize);
      const res = await messaging.sendEachForMulticast({
        tokens: chunk,
        notification: { title, body },
        data: { ...data, title, body },
        android: {
          priority: 'high',
          notification: {
            channelId: ANDROID_CHANNELS[channel],
            sound: 'default',
            defaultSound: true,
            defaultVibrateTimings: true,
            visibility: 'public',
          },
        },
        apns: {
          headers: { 'apns-priority': '10' },
          payload: {
            aps: {
              alert: { title, body },
              sound: 'default',
            },
          },
        },
      });
      success += res.successCount;
      failure += res.failureCount;
      for (const r of res.responses) {
        if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') {
          /* best-effort retire invalid token — match by index in chunk */
        }
      }
    }

    this.log.log(`FCM multicast: ${success} ok, ${failure} failed, ${list.length} tokens`);
    return { tokensAttempted: list.length, success, failure };
  }

  /**
   * Chairman first-responder alarm — high priority, dedicated Android channel for alarm sound + vibration.
   * Clients should open route navigation when `openRoute=1` in the data payload.
   */
  async sendChairmanAlarm(
    userIds: string[],
    title: string,
    body: string,
    data: Record<string, string>,
  ): Promise<{ tokensAttempted: number; success: number; failure: number }> {
    const messaging = this.messaging();
    if (!messaging || userIds.length === 0) {
      return { tokensAttempted: 0, success: 0, failure: 0 };
    }

    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId: { in: userIds } },
      select: { token: true },
      distinct: ['token'],
    });
    const list = tokens.map((t) => t.token).filter(Boolean);
    if (list.length === 0) {
      return { tokensAttempted: 0, success: 0, failure: 0 };
    }

    let success = 0;
    let failure = 0;
    const chunkSize = 500;
    for (let i = 0; i < list.length; i += chunkSize) {
      const chunk = list.slice(i, i + chunkSize);
      const res = await messaging.sendEachForMulticast({
        tokens: chunk,
        notification: { title, body },
        data: { ...data, title, body, channel: 'chairman_alarm' },
        android: {
          priority: 'high',
          ttl: 120_000,
          notification: {
            channelId: ANDROID_CHANNELS.chairman_alarm,
            sound: 'default',
            defaultSound: true,
            defaultVibrateTimings: true,
            visibility: 'public',
            tag: data.incidentId ? `chairman-${data.incidentId}` : 'chairman-emergency',
          },
        },
        apns: {
          headers: { 'apns-priority': '10' },
          payload: {
            aps: {
              alert: { title, body },
              sound: 'default',
              'interruption-level': 'time-sensitive',
            },
          },
        },
      });
      success += res.successCount;
      failure += res.failureCount;
    }

    return { tokensAttempted: list.length, success, failure };
  }
}
