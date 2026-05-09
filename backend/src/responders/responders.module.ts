import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { RespondersService } from './responders.service';
import { RespondersController } from './responders.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [RespondersController],
  providers: [RespondersService],
})
export class RespondersModule {}
