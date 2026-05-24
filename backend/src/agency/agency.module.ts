import { Module } from '@nestjs/common';
import { AgencyController } from './agency.controller';
import { AgencyService } from './agency.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [RealtimeModule, AuditModule],
  controllers: [AgencyController],
  providers: [AgencyService],
  exports: [AgencyService],
})
export class AgencyModule {}
