import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs.query.dto';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogsController {
  constructor(private readonly auditLogs: AuditLogsService) {}

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get()
  list(@Query() q: ListAuditLogsQueryDto) {
    return this.auditLogs.list(q);
  }
}
