import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs.query.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(dto: ListAuditLogsQueryDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 50;
    const where: Prisma.AuditLogWhereInput = {
      ...(dto.entityType ? { entityType: dto.entityType } : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { actor: { select: { id: true, email: true, role: true } } },
      }),
    ]);
    return { items, total, page, limit };
  }
}
