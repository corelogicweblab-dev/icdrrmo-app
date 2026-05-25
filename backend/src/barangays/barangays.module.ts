import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BarangaysService } from './barangays.service';
import { BarangaysController } from './barangays.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [BarangaysController],
  providers: [BarangaysService],
})
export class BarangaysModule {}
