import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemService } from './system.service';
import { SystemController } from './system.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SystemController],
  providers: [SystemService],
})
export class SystemModule {}
