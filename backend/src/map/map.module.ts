import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MapService } from './map.service';
import { MapController } from './map.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MapController],
  providers: [MapService],
})
export class MapModule {}
