import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationType } from '@prisma/client';
import { WeatherService } from './weather.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Pushes a short weather digest to every active citizen (in-app + FCM) on a cron schedule (default: every 5th hour, PH time).
 * Override with env `WEATHER_PUSH_CRON` (six-field cron) and `WEATHER_PUSH_TZ` (default Asia/Manila).
 */
@Injectable()
export class WeatherBroadcastScheduler {
  private readonly log = new Logger(WeatherBroadcastScheduler.name);

  constructor(
    private readonly weather: WeatherService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(process.env.WEATHER_PUSH_CRON ?? '0 0 */5 * * *', { timeZone: process.env.WEATHER_PUSH_TZ ?? 'Asia/Manila' })
  async scheduledWeatherDigest(): Promise<void> {
    try {
      const snap = await this.weather.getSituationSnapshot();
      const temp =
        snap.current.temperatureC != null ? `${Math.round(snap.current.temperatureC)}°C` : '—';
      const title = `ICDRRMO weather · ${snap.current.weatherLabel} (${temp})`;
      const body = `${snap.rainOutlook6h.headline} Follow PAGASA for official warnings.`;
      const r = await this.notifications.notifyAllActiveCitizens({
        title: title.slice(0, 200),
        body: body.slice(0, 3500),
        type: NotificationType.WEATHER_ALERT,
        channel: 'weather',
        data: {
          kind: 'WEATHER_DIGEST',
          fetchedAt: snap.fetchedAt,
        },
      });
      this.log.log(`Weather digest sent: ${r.users} users, FCM ${r.fcm.success}/${r.fcm.tokensAttempted}`);
    } catch (e) {
      this.log.error(`Weather digest failed: ${e instanceof Error ? e.message : e}`);
    }
  }
}
