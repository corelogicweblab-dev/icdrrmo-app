import { Module } from '@nestjs/common';
import { ChairmanController } from './chairman.controller';
import { ChairmanService } from './chairman.service';
import { ChairmanAlertsService } from './chairman-alerts.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { PushModule } from '../push/push.module';
import { JobsModule } from '../jobs/jobs.module';
import { AuditModule } from '../audit/audit.module';
import { CommunicationsModule } from '../communications/communications.module';

@Module({
  imports: [RealtimeModule, PushModule, JobsModule, AuditModule, CommunicationsModule],
  controllers: [ChairmanController],
  providers: [ChairmanService, ChairmanAlertsService],
  exports: [ChairmanAlertsService],
})
export class ChairmanModule {}
