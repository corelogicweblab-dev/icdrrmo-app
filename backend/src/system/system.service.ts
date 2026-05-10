import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async metrics(): Promise<Record<string, unknown>> {
    const mem = process.memoryUsage();
    let dbOk = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {
      dbOk = false;
    }
    return {
      service: 'icdrrmo-api',
      uptimeSec: Math.round(process.uptime()),
      pid: process.pid,
      node: process.version,
      memory: {
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        external: mem.external,
      },
      database: { reachable: dbOk },
      redis: {
        configured: Boolean(this.config.get<string>('REDIS_URL')),
      },
      env: {
        nodeEnv: this.config.get<string>('NODE_ENV', 'development'),
      },
    };
  }

  async logs(limit = 80): Promise<{
    merged: Array<Record<string, unknown>>;
    audit: number;
    incidentLogs: number;
  }> {
    const take = Math.min(200, Math.max(10, limit));
    const [audit, incidentLogs] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take,
        include: {
          actor: { select: { id: true, email: true, role: true } },
        },
      }),
      this.prisma.incidentLog.findMany({
        orderBy: { createdAt: 'desc' },
        take,
        include: {
          incident: { select: { id: true, title: true, status: true } },
          createdBy: { select: { id: true, email: true } },
        },
      }),
    ]);
    const merged = [
      ...audit.map((a) => ({
        kind: 'audit' as const,
        at: a.createdAt.toISOString(),
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        actor: a.actor?.email ?? null,
        metadata: a.metadata,
      })),
      ...incidentLogs.map((l) => ({
        kind: 'incident_log' as const,
        at: l.createdAt.toISOString(),
        action: l.action,
        incidentId: l.incidentId,
        incidentTitle: l.incident?.title,
        createdBy: l.createdBy?.email ?? null,
        details: l.details,
      })),
    ].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    return { merged: merged.slice(0, take), audit: audit.length, incidentLogs: incidentLogs.length };
  }
}
