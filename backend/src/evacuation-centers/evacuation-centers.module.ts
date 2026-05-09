import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { EvacuationCentersService } from './evacuation-centers.service';
import { EvacuationCentersController } from './evacuation-centers.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [EvacuationCentersController],
  providers: [EvacuationCentersService],
})
export class EvacuationCentersModule {}
