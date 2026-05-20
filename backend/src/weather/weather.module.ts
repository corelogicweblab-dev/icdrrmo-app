import { Module } from '@nestjs/common';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';
import { WeatherBroadcastScheduler } from './weather-broadcast.scheduler';
import { PagasaRssService } from './pagasa-rss.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [WeatherController],
  providers: [WeatherService, WeatherBroadcastScheduler, PagasaRssService],
  exports: [WeatherService],
})
export class WeatherModule {}
