import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { OPS_DESK_READ_ROLES } from '../common/ops-desk-roles';
import { CommunicationsService } from './communications.service';

@Controller('communications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...OPS_DESK_READ_ROLES)
export class CommunicationsController {
  constructor(private readonly comms: CommunicationsService) {}

  @Get('sms/inbound')
  listInbound(@Query('take') take?: string) {
    return this.comms.listSmsIngress(take ? Number(take) : 50);
  }

  @Get('sms/outbound')
  listOutbound(@Query('take') take?: string) {
    return this.comms.listSmsOutbound(take ? Number(take) : 50);
  }

  @Get('voice')
  listVoice(@Query('take') take?: string) {
    return this.comms.listVoiceCalls(take ? Number(take) : 50);
  }

  @Get('archive')
  async archive(@Query('take') take?: string) {
    const n = take ? Number(take) : 40;
    const [inbound, outbound, voice] = await Promise.all([
      this.comms.listSmsIngress(n),
      this.comms.listSmsOutbound(n),
      this.comms.listVoiceCalls(n),
    ]);
    return { inbound, outbound, voice };
  }
}
