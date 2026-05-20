import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CommunicationsModule } from '../communications/communications.module';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';

@Module({
  imports: [AuditModule, CommunicationsModule],
  controllers: [AlertsController],
  providers: [AlertsService],
})
export class AlertsModule {}
