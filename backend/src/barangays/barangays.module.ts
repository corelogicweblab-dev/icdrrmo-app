import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BarangaysService } from './barangays.service';
import { BarangaysController } from './barangays.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [PrismaModule, NotificationsModule, RealtimeModule],
  controllers: [BarangaysController],
  providers: [BarangaysService],
})
export class BarangaysModule {}
