import { Module } from '@nestjs/common';
import { SmsParserService } from './sms-parser.service';
import { SmsIngestService } from './sms-ingest.service';
import { SmsIngestController } from './sms-ingest.controller';
import { IncidentsModule } from '../incidents/incidents.module';

@Module({
  imports: [IncidentsModule],
  controllers: [SmsIngestController],
  providers: [SmsParserService, SmsIngestService],
})
export class SmsModule {}
