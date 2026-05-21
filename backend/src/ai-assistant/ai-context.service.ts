import { Injectable } from '@nestjs/common';
import { IncidentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CitizenDashboardService } from '../citizen-dashboard/citizen-dashboard.service';
import { ChairmanService } from '../chairman/chairman.service';
import { CommandCenterService } from '../command-center/command-center.service';
import { WeatherGeojsonMergeService } from '../weather/weather-geojson-merge.service';
import { WeatherService } from '../weather/weather.service';
import { getBarangayScopedUserId } from '../common/barangay-scope';
import type { AiRoleContext } from './ai-assistant.types';

@Injectable()
export class AiContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly citizenFeed: CitizenDashboardService,
    private readonly chairman: ChairmanService,
    private readonly commandCenter: CommandCenterService,
    private readonly geoMerge: WeatherGeojsonMergeService,
    private readonly weather: WeatherService,
  ) {}

  /** Fast path for AI chat — no full citizen feed (avoids 10–20s delay). */
  async buildCitizenLight(actor: JwtPayload): Promise<AiRoleContext> {
    const generatedAt = new Date().toISOString();
    const [situation, profile] = await Promise.all([
      this.weather.getSituationSnapshot().catch(() => null),
      this.prisma.userProfile
        .findUnique({
          where: { userId: actor.sub },
          select: {
            fullName: true,
            barangay: { select: { name: true } },
          },
        })
        .catch(() => null),
    ]);
    const barangayName = profile?.barangay?.name ?? 'your barangay';
    return {
      role: 'CITIZEN',
      generatedAt,
      summary: `Citizen${profile?.fullName ? ` (${profile.fullName})` : ''} · ${barangayName}. Use SOS, Map, Prepare, Alerts, and Profile tabs.`,
      weather: situation,
      evacuation: [],
      advisories: [],
      metrics: { status: 'online', label: 'Live' },
    };
  }

  async build(actor: JwtPayload): Promise<AiRoleContext> {
    const generatedAt = new Date().toISOString();
    if (actor.role === UserRole.CITIZEN) {
      return this.citizenContext(actor, generatedAt);
    }
    if (actor.role === UserRole.BARANGAY_CHAIRMAN) {
      return this.chairmanContext(actor, generatedAt);
    }
    if (actor.role === UserRole.RESPONDER) {
      return this.responderContext(actor, generatedAt);
    }
    return this.opsContext(actor, generatedAt);
  }

  private async citizenContext(actor: JwtPayload, generatedAt: string): Promise<AiRoleContext> {
    let feed: Record<string, unknown>;
    try {
      feed = (await Promise.race([
        this.citizenFeed.getUnifiedFeed(actor),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('feed-timeout')), 14_000);
        }),
      ])) as Record<string, unknown>;
    } catch {
      const situation = await this.weather.getSituationSnapshot().catch(() => null);
      return {
        role: 'CITIZEN',
        generatedAt,
        summary:
          'Signed-in citizen. Dashboard data is updating in the background — you can still ask about SOS, Map, Prepare, and Profile.',
        weather: situation,
        evacuation: [],
        advisories: [],
        metrics: { status: 'online', label: 'Live' },
      };
    }
    const evac = feed.evacuationCenters as unknown[] | undefined;
    const notif = feed.notifications as unknown[] | undefined;
    const community = feed.community as unknown[] | undefined;
    const hazard = feed.hazardGeo as { features?: unknown[] } | undefined;
    const enterprise = feed.enterprise as {
      usageMetrics?: unknown;
      predictiveAlerts?: unknown[];
    } | undefined;
    return {
      role: 'CITIZEN',
      generatedAt,
      summary: `Safety: ${String(feed.safetyStatus)}. ${evac?.length ?? 0} evacuation sites. ${notif?.length ?? 0} recent alerts.`,
      weather: feed.situation,
      evacuation: evac?.slice(0, 8),
      advisories: hazard?.features?.slice(0, 15) ?? [],
      citizenEngagement: {
        communityPosts: community?.length ?? 0,
        preparednessDone: enterprise?.usageMetrics,
        predictiveAlerts: enterprise?.predictiveAlerts?.slice(0, 5),
      },
      metrics: feed.systemHealth,
    };
  }

  private async chairmanContext(actor: JwtPayload, generatedAt: string): Promise<AiRoleContext> {
    const [dash, incidents, geo, situation, evac, vehicles, responders] = await Promise.all([
      this.chairman.getDashboard(actor),
      this.chairman.listIncidents(actor),
      this.geoMerge.buildMergedGeoJson(),
      this.weather.getSituationSnapshot().catch(() => null),
      this.evacForChairman(actor),
      this.resourcesForBarangay(actor, 'vehicles'),
      this.resourcesForBarangay(actor, 'responders'),
    ]);
    const incList = Array.isArray(incidents) ? incidents : [];
    return {
      role: 'BARANGAY_CHAIRMAN',
      generatedAt,
      summary: `Barangay ${dash.barangay?.name ?? '—'}: ${dash.stats.openCount} open, ${dash.stats.ongoingCount} ongoing, ${dash.stats.resolvedToday} resolved today.`,
      incidents: incList.slice(0, 12),
      weather: situation,
      evacuation: evac,
      advisories: geo.features?.slice(0, 12) ?? [],
      resources: { vehicles, responders },
      governance: {
        stats: dash.stats,
        kpis: await this.chairmanKpis(actor),
      },
      metrics: await this.chairman.getSystemHealth(actor).catch(() => null),
    };
  }

  private async chairmanKpis(actor: JwtPayload) {
    const barangayId = await getBarangayScopedUserId(this.prisma, actor);
    if (!barangayId) return null;
    const since = new Date(Date.now() - 7 * 86_400_000);
    const resolved = await this.prisma.incident.findMany({
      where: {
        barangayId,
        status: { in: [IncidentStatus.RESOLVED, IncidentStatus.CLOSED] },
        updatedAt: { gte: since },
      },
      select: { createdAt: true, updatedAt: true },
      take: 50,
    });
    const avgMin =
      resolved.length > 0
        ? Math.round(
            resolved.reduce((s, i) => s + (i.updatedAt.getTime() - i.createdAt.getTime()) / 60_000, 0) /
              resolved.length,
          )
        : null;
    const total = await this.prisma.incident.count({
      where: { barangayId, createdAt: { gte: since } },
    });
    const resolvedCount = resolved.length;
    return {
      avgResponseMinutes: avgMin,
      resolutionRatePct: total > 0 ? Math.round((resolvedCount / total) * 100) : 0,
      incidents7d: total,
    };
  }

  private async evacForChairman(actor: JwtPayload) {
    const barangayId = await getBarangayScopedUserId(this.prisma, actor);
    if (!barangayId) return [];
    return this.prisma.evacuationCenter.findMany({
      where: { barangayId, isActive: true },
      take: 15,
      select: { name: true, capacity: true, occupancy: true, latitude: true, longitude: true },
    });
  }

  private async resourcesForBarangay(actor: JwtPayload, kind: 'vehicles' | 'responders') {
    const barangayId = await getBarangayScopedUserId(this.prisma, actor);
    if (!barangayId) return [];
    if (kind === 'vehicles') {
      return this.prisma.vehicle.findMany({
        where: { isActive: true },
        take: 20,
        select: { plateNumber: true, fleetStatus: true, type: true },
      });
    }
    return this.prisma.responder.findMany({
      where: { user: { profile: { barangayId } } },
      take: 20,
      include: { user: { select: { email: true } } },
    });
  }

  private async responderContext(actor: JwtPayload, generatedAt: string): Promise<AiRoleContext> {
    const responder = await this.prisma.responder.findUnique({
      where: { userId: actor.sub },
      include: { vehicle: { select: { plateNumber: true, fleetStatus: true } } },
    });
    const assignments = responder
      ? await this.prisma.incident.findMany({
          where: {
            assignedResponderId: responder.id,
            status: {
              notIn: [IncidentStatus.CLOSED, IncidentStatus.FALSE_ALARM, IncidentStatus.RESOLVED],
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            reporter: {
              select: {
                phone: true,
                profile: {
                  select: {
                    fullName: true,
                    bloodType: true,
                    allergies: true,
                    medicalConditions: true,
                  },
                },
              },
            },
          },
        })
      : [];
    const completed = responder
      ? await this.prisma.incident.count({
          where: {
            assignedResponderId: responder.id,
            status: { in: [IncidentStatus.RESOLVED, IncidentStatus.CLOSED] },
            updatedAt: { gte: new Date(Date.now() - 30 * 86_400_000) },
          },
        })
      : 0;
    return {
      role: 'RESPONDER',
      generatedAt,
      summary: `${assignments.length} active assignment(s). ${completed} resolved in last 30 days.`,
      incidents: assignments.map((i) => ({
        id: i.id,
        type: i.type,
        status: i.status,
        lat: Number(i.latitude),
        lon: Number(i.longitude),
        reporterMedical: i.reporter?.profile,
        reporterPhone: i.reporter?.phone,
      })),
      resources: { vehicle: responder?.vehicle, status: responder?.status },
      metrics: { resolved30d: completed },
    };
  }

  private async opsContext(actor: JwtPayload, generatedAt: string): Promise<AiRoleContext> {
    const snap = (await this.commandCenter.snapshot(actor)) as Record<string, unknown>;
    const summary = snap.summary as { openIncidents?: number } | undefined;
    const responderStats = snap.responderStats as { onMission?: number } | undefined;
    const riskMatrix = snap.riskMatrix as unknown[] | undefined;
    return {
      role: actor.role,
      generatedAt,
      summary: `EOC: ${summary?.openIncidents ?? 0} open incidents. ${responderStats?.onMission ?? 0} responders on mission.`,
      incidents: (snap.liveIncidents as unknown[])?.slice(0, 10),
      weather: snap.weatherSituation,
      evacuation: (snap.evacuationAlerts as unknown[]) ?? [],
      advisories: riskMatrix?.slice(0, 8),
      resources: {
        vehicles: snap.vehicleStats,
        responders: snap.responderStats,
      },
      governance: snap.summary,
      metrics: snap.multiTenancy,
    };
  }
}
