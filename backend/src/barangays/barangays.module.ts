import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BarangaysService } from './barangays.service';
import { BarangaysController } from './barangays.controller';
import { BarangaysPublicController } from './barangays-public.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BarangaysPublicController, BarangaysController],
  providers: [BarangaysService],
})
export class BarangaysModule {}
