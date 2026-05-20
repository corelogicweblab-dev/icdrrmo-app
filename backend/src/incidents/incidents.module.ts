import { Module } from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { IncidentsController } from './incidents.controller';
import { RealtimeModule } from '../realtime/realtime.module';
import { ChairmanModule } from '../chairman/chairman.module';

@Module({
  imports: [RealtimeModule, ChairmanModule],
  controllers: [IncidentsController],
  providers: [IncidentsService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
