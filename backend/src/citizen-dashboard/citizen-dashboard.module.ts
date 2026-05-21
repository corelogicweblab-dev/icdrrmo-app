import { Module } from '@nestjs/common';
import { CitizenDashboardController } from './citizen-dashboard.controller';
import { CitizenDashboardService } from './citizen-dashboard.service';
import { WeatherModule } from '../weather/weather.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { IncidentsModule } from '../incidents/incidents.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [WeatherModule, AnalyticsModule, IncidentsModule, RealtimeModule],
  controllers: [CitizenDashboardController],
  providers: [CitizenDashboardService],
  exports: [CitizenDashboardService],
})
export class CitizenDashboardModule {}
