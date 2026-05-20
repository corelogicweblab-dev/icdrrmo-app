import { Module, forwardRef } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { WeatherModule } from '../weather/weather.module';
import { CommandCenterController } from './command-center.controller';
import { CommandCenterService } from './command-center.service';

@Module({
  imports: [forwardRef(() => DashboardModule), WeatherModule, AnalyticsModule],
  controllers: [CommandCenterController],
  providers: [CommandCenterService],
  exports: [CommandCenterService],
})
export class CommandCenterModule {}
