import { Module } from '@nestjs/common';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';
import { WeatherBroadcastScheduler } from './weather-broadcast.scheduler';
import { PagasaRssService } from './pagasa-rss.service';
import { GdacsGeorssService } from './gdacs-georss.service';
import { PagasaPortalService } from './pagasa-portal.service';
import { WeatherGeojsonMergeService } from './weather-geojson-merge.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [WeatherController],
  providers: [
    WeatherService,
    WeatherBroadcastScheduler,
    PagasaRssService,
    GdacsGeorssService,
    PagasaPortalService,
    WeatherGeojsonMergeService,
  ],
  exports: [WeatherService, WeatherGeojsonMergeService],
})
export class WeatherModule {}
