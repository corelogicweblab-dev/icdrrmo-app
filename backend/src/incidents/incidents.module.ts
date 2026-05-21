import { Module } from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { IncidentsController } from './incidents.controller';
import { IncidentNotificationsService } from './incident-notifications.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { ChairmanModule } from '../chairman/chairman.module';
import { CommunicationsModule } from '../communications/communications.module';

@Module({
  imports: [RealtimeModule, ChairmanModule, CommunicationsModule],
  controllers: [IncidentsController],
  providers: [IncidentsService, IncidentNotificationsService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
