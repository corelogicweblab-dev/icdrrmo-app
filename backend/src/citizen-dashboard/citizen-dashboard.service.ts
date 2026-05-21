import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CommunityPostCategory,
  IncidentStatus,
  NotificationType,
  UserRole,
} from '@prisma/client';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { WeatherGeojsonMergeService } from '../weather/weather-geojson-merge.service';
import { WeatherService } from '../weather/weather.service';
import { RiskScoringService } from '../analytics/risk-scoring.service';
import { IncidentsService } from '../incidents/incidents.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import {
  computeBadges,
  DEFAULT_PREPAREDNESS_CHECKLIST,
  type PreparednessCheckItem,
} from './citizen-preparedness.defaults';
import { PatchPreparednessDto } from './dto/patch-preparedness.dto';
import { UpsertEmergencyContactDto } from './dto/upsert-emergency-contact.dto';

const REDIS_FEED_PREFIX = 'icdrrmo:citizen:feed:';
const LIFECYCLE_MAP: Record<
  IncidentStatus,
  'reported' | 'verified' | 'responded' | 'resolved' | 'closed'
> = {
  [IncidentStatus.OPEN]: 'reported',
  [IncidentStatus.ACKNOWLEDGED]: 'verified',
  [IncidentStatus.DISPATCHED]: 'responded',
  [IncidentStatus.IN_PROGRESS]: 'responded',
  [IncidentStatus.RESOLVED]: 'resolved',
  [IncidentStatus.CLOSED]: 'closed',
  [IncidentStatus.FALSE_ALARM]: 'closed',
};

export type CitizenSafetyStatus = 'safe' | 'caution' | 'evacuate';

@Injectable()
export class CitizenDashboardService implements OnModuleInit {
  private readonly logger = new Logger(CitizenDashboardService.name);
  private redis: Redis | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly geoMerge: WeatherGeojsonMergeService,
    private readonly weather: WeatherService,
    private readonly riskScoring: RiskScoringService,
    private readonly incidents: IncidentsService,
    private readonly realtime: RealtimeGateway,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL')?.trim();
    if (url) {
      try {
        this.redis = new Redis(url, { maxRetriesPerRequest: 2 });
      } catch {
        this.redis = null;
      }
    }
    void this.seedCommunityPostsIfEmpty();
  }

  private feedCacheTtlSec(): number {
    const n = Number(process.env.CITIZEN_FEED_CACHE_TTL_SEC ?? 90);
    return Number.isFinite(n) && n > 10 ? Math.min(600, Math.floor(n)) : 90;
  }

  private async seedCommunityPostsIfEmpty(): Promise<void> {
    try {
      const count = await this.prisma.communityPost.count();
      if (count > 0) return;
      const barangays = await this.prisma.barangay.findMany({
        take: 3,
        orderBy: { name: 'asc' },
      });
      const bg = barangays[0]?.id ?? null;
      const seeds: Array<{
        category: CommunityPostCategory;
        title: string;
        body: string;
        locale: string;
      }> = [
        {
          category: CommunityPostCategory.ADVISORY,
          title: 'Maghanda sa tag-ulan',
          body: 'I-check ang go bag at alamin ang pinakamalapit na evacuation center sa inyong barangay.',
          locale: 'tl',
        },
        {
          category: CommunityPostCategory.VOLUNTEER,
          title: 'Kailangan ng volunteers — sandbagging',
          body: 'Tumawag sa barangay hall kung pwede kayong tumulong maghanda ng sandbags bukas 8 AM.',
          locale: 'tl',
        },
        {
          category: CommunityPostCategory.DONATION,
          title: 'Donasyon: malinis na tubig at blanket',
          body: 'Tumatanggap ang evacuation center ng in-kind donations. I-coordinate sa ops bago mag-drop off.',
          locale: 'en',
        },
        {
          category: CommunityPostCategory.BARANGAY,
          title: 'Barangay coordination meeting',
          body: 'Quarterly DRRM meeting — all purok leaders invited. Venue: barangay hall.',
          locale: 'en',
        },
      ];
      for (const s of seeds) {
        await this.prisma.communityPost.create({
          data: { ...s, barangayId: bg, isPinned: s.category === CommunityPostCategory.ADVISORY },
        });
      }
      this.logger.log(`Seeded ${seeds.length} community posts`);
    } catch (e) {
      this.logger.warn(`Community seed skipped: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async getUnifiedFeed(actor: JwtPayload, lat?: number, lng?: number) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: actor.sub },
      include: {
        barangay: {
          select: {
            id: true,
            name: true,
            code: true,
            opsFloodActive: true,
            opsFloodMessage: true,
            opsRedZoneActive: true,
            opsRedZoneMessage: true,
            isFloodProne: true,
          },
        },
      },
    });
    const barangayId = profile?.barangayId ?? null;
    const cacheKey = `${REDIS_FEED_PREFIX}${barangayId ?? 'none'}:${actor.sub}`;

    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached) as Record<string, unknown>;
      } catch {
        /* ignore */
      }
    }

    const openIncidentCount = await this.prisma.incident.count({
      where: {
        status: { notIn: [IncidentStatus.RESOLVED, IncidentStatus.CLOSED, IncidentStatus.FALSE_ALARM] },
        ...(barangayId ? { barangayId } : {}),
      },
    });

    const [
      hazardGeo,
      weatherBundle,
      situation,
      evacCenters,
      community,
      myIncidents,
      notifications,
      enterprise,
    ] = await Promise.all([
      this.geoMerge.buildMergedGeoJson(),
      this.weather.getEocWeatherBundle(),
      this.weather.getSituationSnapshot(),
      this.listEvacForCitizen(actor, lat, lng),
      this.listCommunity(actor, 30),
      this.listMyIncidents(actor),
      this.prisma.notification.findMany({
        where: { userId: actor.sub },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.buildEnterpriseMetrics(actor, barangayId, openIncidentCount),
    ]);

    const safetyStatus = this.computeSafetyStatus(
      profile?.barangay ?? null,
      openIncidentCount,
      enterprise.predictiveAlerts as Array<{ level: string }>,
    );

    const payload = {
      generatedAt: new Date().toISOString(),
      safetyStatus,
      safetyLabels: {
        safe: { en: 'Safe', tl: 'Ligtas' },
        caution: { en: 'Caution', tl: 'Mag-ingat' },
        evacuate: { en: 'Evacuate', tl: 'Lumikas' },
      },
      profile: profile
        ? {
            fullName: profile.fullName,
            barangay: profile.barangay,
            bloodType: profile.bloodType,
            allergies: profile.allergies,
            medicalConditions: profile.medicalConditions,
          }
        : null,
      hazardGeo,
      weather: weatherBundle,
      situation,
      evacuationCenters: evacCenters,
      community,
      myIncidents,
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        type: n.type,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
      heatmaps: await this.buildHeatmaps(barangayId),
      enterprise,
      systemHealth: await this.systemHealth(),
    };

    if (this.redis) {
      try {
        await this.redis.setex(cacheKey, this.feedCacheTtlSec(), JSON.stringify(payload));
      } catch {
        /* ignore */
      }
    }
    return payload;
  }

  private computeSafetyStatus(
    barangay: {
      opsFloodActive: boolean;
      opsRedZoneActive: boolean;
      opsFloodMessage: string | null;
      opsRedZoneMessage: string | null;
    } | null,
    openIncidents: number,
    predictive: Array<{ level: string }>,
  ): CitizenSafetyStatus {
    if (barangay?.opsRedZoneActive || barangay?.opsFloodActive) return 'evacuate';
    const critical = predictive.some((p) => p.level === 'critical' || p.level === 'high');
    if (critical || openIncidents >= 5) return 'evacuate';
    if (openIncidents >= 1 || predictive.some((p) => p.level === 'moderate')) return 'caution';
    return 'safe';
  }

  private async listEvacForCitizen(actor: JwtPayload, lat?: number, lng?: number) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: actor.sub },
      select: { barangayId: true },
    });
    if (!profile?.barangayId) return [];
    const rows = await this.prisma.evacuationCenter.findMany({
      where: { barangayId: profile.barangayId, isActive: true },
      include: { barangay: { select: { name: true } } },
    });
    const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };
    return rows
      .map((r) => {
        const cap = r.capacity ?? 0;
        const occ = r.occupancy;
        const utilization = cap > 0 ? Math.round((occ / cap) * 100) : null;
        const facilities = (r.notes ?? '')
          .split(/[,;|]/)
          .map((s) => s.trim())
          .filter(Boolean);
        const distanceKm =
          lat != null && lng != null
            ? haversine(lat, lng, Number(r.latitude), Number(r.longitude))
            : undefined;
        return {
          id: r.id,
          name: r.name,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          capacity: r.capacity,
          occupancy: r.occupancy,
          utilizationPct: utilization,
          availableSlots: cap > 0 ? Math.max(0, cap - occ) : null,
          contactPhone: r.contactPhone,
          facilities: facilities.length ? facilities : ['Shelter', 'Water', 'First aid'],
          barangayName: r.barangay?.name ?? null,
          directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${Number(r.latitude)},${Number(r.longitude)}`,
          distanceKm: distanceKm != null ? Math.round(distanceKm * 100) / 100 : undefined,
        };
      })
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }

  async listCommunity(actor: JwtPayload, take = 30) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: actor.sub },
      select: { barangayId: true },
    });
    const where = profile?.barangayId
      ? { OR: [{ barangayId: profile.barangayId }, { barangayId: null }] }
      : {};
    const rows = await this.prisma.communityPost.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take,
      include: {
        barangay: { select: { name: true } },
        author: { select: { email: true } },
      },
    });
    return rows.map((p) => ({
      id: p.id,
      category: p.category,
      title: p.title,
      body: p.body,
      locale: p.locale,
      isPinned: p.isPinned,
      barangayName: p.barangay?.name ?? 'Citywide',
      author: p.author?.email ? p.author.email.split('@')[0] : 'ICDRRMO',
      createdAt: p.createdAt.toISOString(),
    }));
  }

  async listMyIncidents(actor: JwtPayload) {
    const rows = await this.prisma.incident.findMany({
      where: { reporterId: actor.sub },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: { barangay: { select: { name: true } } },
    });
    return rows.map((i) => ({
      id: i.id,
      type: i.type,
      status: i.status,
      lifecycle: LIFECYCLE_MAP[i.status],
      title: i.title,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
      barangayName: i.barangay?.name ?? null,
    }));
  }

  async getMyIncidentTimeline(actor: JwtPayload, incidentId: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      select: { reporterId: true },
    });
    if (!incident) throw new NotFoundException('Incident not found');
    if (incident.reporterId !== actor.sub) {
      throw new ForbiddenException('Not your incident');
    }
    const timeline = await this.incidents.getTimelineForReporter(actor, incidentId);
    return timeline;
  }

  async getMedicalSnapshot(userId: string) {
    const [profile, contacts] = await Promise.all([
      this.prisma.userProfile.findUnique({
        where: { userId },
        include: { barangay: { select: { name: true } } },
      }),
      this.prisma.emergencyContact.findMany({
        where: { userId },
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);
    if (!profile) return null;
    return {
      fullName: profile.fullName,
      bloodType: profile.bloodType,
      allergies: profile.allergies,
      medicalConditions: profile.medicalConditions,
      emergencyNotes: profile.emergencyNotes,
      barangay: profile.barangay?.name ?? null,
      streetPurok: profile.streetPurok,
      phone: (
        await this.prisma.user.findUnique({ where: { id: userId }, select: { phone: true } })
      )?.phone,
      emergencyContacts: contacts.map((c) => ({
        id: c.id,
        fullName: c.fullName,
        phone: c.phone,
        relationship: c.relationship,
        priority: c.priority,
      })),
    };
  }

  async listEmergencyContacts(actor: JwtPayload) {
    return this.prisma.emergencyContact.findMany({
      where: { userId: actor.sub },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createEmergencyContact(actor: JwtPayload, dto: UpsertEmergencyContactDto) {
    return this.prisma.emergencyContact.create({
      data: {
        userId: actor.sub,
        fullName: dto.fullName.trim(),
        phone: dto.phone.trim(),
        relationship: dto.relationship?.trim(),
        priority: dto.priority ?? 0,
      },
    });
  }

  async deleteEmergencyContact(actor: JwtPayload, id: string) {
    const row = await this.prisma.emergencyContact.findFirst({
      where: { id, userId: actor.sub },
    });
    if (!row) throw new NotFoundException('Contact not found');
    await this.prisma.emergencyContact.delete({ where: { id } });
    return { ok: true };
  }

  async getPreparedness(actor: JwtPayload) {
    let row = await this.prisma.citizenPreparedness.findUnique({
      where: { userId: actor.sub },
    });
    if (!row) {
      row = await this.prisma.citizenPreparedness.create({
        data: {
          userId: actor.sub,
          checklist: DEFAULT_PREPAREDNESS_CHECKLIST,
          badges: [],
        },
      });
    }
    const checklist = (row.checklist as PreparednessCheckItem[]) ?? DEFAULT_PREPAREDNESS_CHECKLIST;
    const doneCount = checklist.filter((c) => c.done).length;
    return {
      checklist,
      badges: row.badges as string[],
      doneCount,
      total: checklist.length,
      badgeCatalog: computeBadges(doneCount),
    };
  }

  async patchPreparedness(actor: JwtPayload, dto: PatchPreparednessDto) {
    const current = await this.getPreparedness(actor);
    const map = new Map(current.checklist.map((c) => [c.id, c]));
    for (const patch of dto.checklist ?? []) {
      const item = map.get(patch.id);
      if (!item) continue;
      item.done = patch.done;
      item.doneAt = patch.done ? new Date().toISOString() : null;
    }
    const checklist = [...map.values()];
    const doneCount = checklist.filter((c) => c.done).length;
    const badges = computeBadges(doneCount);
    await this.prisma.citizenPreparedness.upsert({
      where: { userId: actor.sub },
      create: { userId: actor.sub, checklist, badges },
      update: { checklist, badges },
    });
    this.realtime.emitCitizenFeedUpdated(actor.sub, { reason: 'preparedness' });
    return { checklist, badges, doneCount, total: checklist.length };
  }

  private async buildHeatmaps(barangayId: string | null) {
    const incidentWhere = barangayId
      ? {
          barangayId,
          status: {
            notIn: [IncidentStatus.CLOSED, IncidentStatus.FALSE_ALARM] as IncidentStatus[],
          },
        }
      : {
          status: {
            notIn: [IncidentStatus.CLOSED, IncidentStatus.FALSE_ALARM] as IncidentStatus[],
          },
        };
    const [incidents, evacCenters, situation] = await Promise.all([
      this.prisma.incident.findMany({
        where: incidentWhere,
        take: 200,
        select: { latitude: true, longitude: true, type: true, isCritical: true },
      }),
      this.prisma.evacuationCenter.findMany({
        where: { isActive: true, ...(barangayId ? { barangayId } : {}) },
        select: { latitude: true, longitude: true, capacity: true, occupancy: true, name: true },
      }),
      this.weather.getSituationSnapshot(),
    ]);

    const incidentFeatures = incidents.map((i, idx) => ({
      type: 'Feature' as const,
      id: `inc-${idx}`,
      geometry: {
        type: 'Point' as const,
        coordinates: [Number(i.longitude), Number(i.latitude)],
      },
      properties: {
        layer: 'incident_density',
        weight: i.isCritical ? 1 : 0.6,
        incidentType: i.type,
      },
    }));

    const rainWeight = (situation?.rainOutlook6h?.maxPrecipProbPct ?? 0) / 100;
    const rainfallFeatures =
      rainWeight > 0.1 && barangayId
        ? [
            {
              type: 'Feature' as const,
              properties: { layer: 'rainfall_intensity', weight: rainWeight },
              geometry: { type: 'Point' as const, coordinates: [122.0, 17.0] },
            },
          ]
        : [];

    const evacFeatures = evacCenters.map((e, idx) => {
      const cap = e.capacity ?? 100;
      const demand = cap > 0 ? e.occupancy / cap : 0.5;
      return {
        type: 'Feature' as const,
        id: `evac-${idx}`,
        geometry: {
          type: 'Point' as const,
          coordinates: [Number(e.longitude), Number(e.latitude)],
        },
        properties: {
          layer: 'evacuation_demand',
          weight: Math.min(1, demand),
          name: e.name,
        },
      };
    });

    return {
      incidentDensity: { type: 'FeatureCollection', features: incidentFeatures },
      rainfallIntensity: { type: 'FeatureCollection', features: rainfallFeatures },
      evacuationDemand: { type: 'FeatureCollection', features: evacFeatures },
    };
  }

  private async buildEnterpriseMetrics(
    actor: JwtPayload,
    barangayId: string | null,
    openIncidents: number,
  ) {
    const barangays = await this.prisma.barangay.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        isFloodProne: true,
        opsFloodActive: true,
        opsRedZoneActive: true,
      },
    });
    const situation = await this.weather.getSituationSnapshot();
    const scores = await this.riskScoring.scoreBarangays(barangays, situation, openIncidents);
    const myScore = barangayId ? scores.find((s) => s.barangayId === barangayId) : null;

    const activeByBarangay = await this.prisma.userProfile.groupBy({
      by: ['barangayId'],
      where: { user: { role: UserRole.CITIZEN, isActive: true }, barangayId: { not: null } },
      _count: { id: true },
    });

    const advisoryReads = await this.prisma.notification.count({
      where: {
        userId: actor.sub,
        type: { in: [NotificationType.WEATHER_ALERT, NotificationType.EVACUATION, NotificationType.EMERGENCY_ALERT] },
        readAt: { not: null },
      },
    });
    const advisoryTotal = await this.prisma.notification.count({
      where: {
        userId: actor.sub,
        type: { in: [NotificationType.WEATHER_ALERT, NotificationType.EVACUATION, NotificationType.EMERGENCY_ALERT] },
      },
    });

    return {
      predictiveAlerts: scores
        .filter((s) => s.level === 'critical' || s.level === 'high' || s.level === 'moderate')
        .slice(0, 8)
        .map((s) => ({
          barangayId: s.barangayId,
          barangayName: s.name,
          score: s.score,
          level: s.level,
          horizonHours: 6,
          factors: s.factors,
          engine: s.engine,
          message:
            s.level === 'critical'
              ? `High risk in the next 6 hours — ${s.name}`
              : `Elevated risk — monitor advisories for ${s.name}`,
        })),
      myBarangayRisk: myScore,
      usageMetrics: {
        activeCitizensByBarangay: activeByBarangay.map((r) => ({
          barangayId: r.barangayId,
          count: r._count.id,
        })),
        advisoryEngagementPct:
          advisoryTotal > 0 ? Math.round((advisoryReads / advisoryTotal) * 100) : 0,
        advisoriesRead: advisoryReads,
        advisoriesTotal: advisoryTotal,
      },
    };
  }

  async systemHealth() {
    let dbOk = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {
      dbOk = false;
    }
    const redisConfigured = Boolean(this.config.get<string>('REDIS_URL'));
    const online = dbOk;
    return {
      status: online ? 'online' : 'degraded',
      label: online ? 'System Online' : 'Limited Service',
      database: dbOk,
      redis: redisConfigured,
      realtime: true,
      checkedAt: new Date().toISOString(),
    };
  }

  invalidateFeedCache(userId: string, barangayId: string | null): void {
    if (!this.redis) return;
    const key = `${REDIS_FEED_PREFIX}${barangayId ?? 'none'}:${userId}`;
    void this.redis.del(key).catch(() => {});
  }
}
