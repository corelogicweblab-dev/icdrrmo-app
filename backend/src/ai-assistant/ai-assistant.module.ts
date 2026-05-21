import { Module } from '@nestjs/common';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './ai-assistant.service';
import { AiContextService } from './ai-context.service';
import { CitizenDashboardModule } from '../citizen-dashboard/citizen-dashboard.module';
import { ChairmanModule } from '../chairman/chairman.module';
import { CommandCenterModule } from '../command-center/command-center.module';
import { WeatherModule } from '../weather/weather.module';

@Module({
  imports: [CitizenDashboardModule, ChairmanModule, CommandCenterModule, WeatherModule],
  controllers: [AiAssistantController],
  providers: [AiAssistantService, AiContextService],
  exports: [AiAssistantService],
})
export class AiAssistantModule {}
