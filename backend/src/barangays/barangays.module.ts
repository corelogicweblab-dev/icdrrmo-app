import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BarangaysService } from './barangays.service';
import { BarangaysController } from './barangays.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BarangaysController],
  providers: [BarangaysService],
})
export class BarangaysModule {}
