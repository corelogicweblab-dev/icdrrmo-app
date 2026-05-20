import { Injectable, NotFoundException } from '@nestjs/common';
import {
  IncidentStatus,
  Prisma,
  ResponderStatus,
  UserRole,
  VehicleFleetStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { getOperatorBarangayId } from '../common/ops-operator-scope';
import { isDeskGlobalView } from '../common/ops-desk-roles';
import { estimateDriveMin, haversineKm } from '../common/geo.util';
import { RiskScoringService } from '../analytics/risk-scoring.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { WeatherService } from '../weather/weather.service';

const TERMINAL: IncidentStatus[] = [
  IncidentStatus.CLOSED,
  IncidentStatus.FALSE_ALARM,
  IncidentStatus.RESOLVED,
];

@Injectable()
export class CommandCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
    private readonly weather: WeatherService,
    private readonly riskScoring: RiskScoringService,
  ) {}

  private async incidentScope(actor: JwtPayload): Promise<Prisma.IncidentWhereInput> {
    const base: Prisma.IncidentWhereInput = { status: { notIn: TERMINAL } };
    if (isDeskGlobalView(actor)) return base;
    const bg = await getOperatorBarangayId(this.prisma, actor);
    if (!bg) return { ...base, id: '__none__' };
    return {
      ...base,
      OR: [{ barangayId: bg }, { reporter: { profile: { barangayId: bg } } }],
    };
  }

  async snapshot(actor: JwtPayload) {
    const summary = await this.dashboard.summary(actor);
    const incidentWhere = await this.incidentScope(actor);

    const [
      incidents,
      vehicles,
      responders,
      evacuationCenters,
      barangays,
      recentAudit,
      smsRecent,
      notificationRecent,
    ] = await this.prisma.$transaction([
      this.prisma.incident.findMany({
        where: incidentWhere,
        orderBy: [{ isCritical: 'desc' }, { createdAt: 'desc' }],
        take: 12,
        include: {
          barangay: { select: { name: true, code: true } },
          assigned: { include: { user: { select: { email: true } } } },
        },
      }),
      this.prisma.vehicle.findMany({
        where: { isActive: true },
        orderBy: { plateNumber: 'asc' },
        take: 40,
      }),
      this.prisma.responder.findMany({
        where: isDeskGlobalView(actor)
          ? {}
          : {
              user: {
                profile: {
                  barangayId: (await getOperatorBarangayId(this.prisma, actor)) ?? undefined,
                },
              },
            },
        include: {
          user: { select: { email: true } },
          vehicle: { select: { plateNumber: true, type: true, fleetStatus: true } },
          locations: { orderBy: { recordedAt: 'desc' }, take: 1 },
        },
        take: 50,
      }),
      this.prisma.evacuationCenter.findMany({
        where: {
          isActive: true,
          ...(isDeskGlobalView(actor)
            ? {}
            : { barangayId: (await getOperatorBarangayId(this.prisma, actor)) ?? undefined }),
        },
        include: { barangay: { select: { name: true } } },
        take: 30,
      }),
      this.prisma.barangay.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          isFloodProne: true,
          opsFloodActive: true,
          opsRedZoneActive: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { actor: { select: { email: true, role: true } } },
      }),
      this.prisma.smsIngress.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          createdAt: true,
          fromPhone: true,
          incidentId: true,
          processed: true,
        },
      }),
      this.prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { id: true, title: true, type: true, createdAt: true, pushSent: true },
      }),
    ]);

    let weatherSituation: Awaited<ReturnType<WeatherService['getSituationSnapshot']>> | null = null;
    try {
      weatherSituation = await this.weather.getSituationSnapshot();
    } catch {
      weatherSituation = null;
    }

    const vehicleStats = {
      available: vehicles.filter((v) => v.fleetStatus === VehicleFleetStatus.AVAILABLE).length,
      deployed: vehicles.filter((v) => v.fleetStatus === VehicleFleetStatus.DEPLOYED).length,
      maintenance: vehicles.filter((v) => v.fleetStatus === VehicleFleetStatus.UNDER_MAINTENANCE).length,
    };

    const responderStats = {
      available: responders.filter((r) => r.status === ResponderStatus.AVAILABLE).length,
      onMission: responders.filter((r) => {
        const s = r.status;
        return (
          s === ResponderStatus.DISPATCHED ||
          s === ResponderStatus.EN_ROUTE ||
          s === ResponderStatus.ON_SCENE ||
          s === ResponderStatus.TRANSPORTING
        );
      }).length,
      offDuty: responders.filter(
        (r) => r.status === ResponderStatus.OFF_DUTY || r.status === ResponderStatus.UNAVAILABLE,
      ).length,
    };

    const evacuationAlerts = evacuationCenters
      .map((e) => {
        const cap = e.capacity ?? 0;
        const occ = e.occupancy;
        const pct = cap > 0 ? Math.round((occ / cap) * 100) : null;
        return {
          id: e.id,
          name: e.name,
          barangay: e.barangay?.name ?? null,
          occupancy: occ,
          capacity: cap,
          occupancyPct: pct,
          alert: pct != null && pct >= 85 ? ('critical' as const) : pct != null && pct >= 70 ? ('warning' as const) : null,
        };
      })
      .filter((e) => e.alert);

    const riskMatrix = await this.riskScoring.scoreBarangays(
      barangays,
      weatherSituation,
      summary.openIncidents as number,
    );

    const heatmapPoints = incidents.map((i) => ({
      id: i.id,
      lat: Number(i.latitude),
      lon: Number(i.longitude),
      weight: i.isCritical ? 3 : 1,
      type: i.type,
      status: i.status,
    }));

    const summaryKpis = {
      openIncidents: Number(summary.openIncidents ?? 0),
      activeResponders: Number(summary.activeResponders ?? 0),
      activeVehicles: Number(summary.activeVehicles ?? 0),
      evacuationSites: Number(summary.evacuationSites ?? 0),
      ...(typeof summary === 'object' && summary !== null
        ? {
            scoped: (summary as { scoped?: boolean }).scoped,
            operatorBarangayMissing: (summary as { operatorBarangayMissing?: boolean })
              .operatorBarangayMissing,
            message: (summary as { message?: string }).message,
          }
        : {}),
    };

    return {
      generatedAt: new Date().toISOString(),
      readOnly: (actor.role as string) === 'AUDITOR',
      multiTenancy: {
        model: 'barangay',
        scoped: !isDeskGlobalView(actor),
        description: 'Each barangay is an isolated tenant; city-wide admins see unified platform data.',
      },
      summary: summaryKpis,
      liveIncidents: incidents.map((i) => ({
        id: i.id,
        type: i.type,
        status: i.status,
        isCritical: i.isCritical,
        channel: i.channel,
        latitude: Number(i.latitude),
        longitude: Number(i.longitude),
        createdAt: i.createdAt,
        barangay: i.barangay,
        assignedEmail: i.assigned?.user.email ?? null,
        urgency: i.isCritical ? 'critical' : i.status === IncidentStatus.OPEN ? 'high' : 'moderate',
      })),
      resources: {
        vehicles: vehicleStats,
        responders: responderStats,
        vehiclesList: vehicles.slice(0, 12).map((v) => ({
          id: v.id,
          plateNumber: v.plateNumber,
          type: v.type,
          fleetStatus: v.fleetStatus,
          hasGps: v.latitude != null && v.longitude != null,
        })),
      },
      evacuation: {
        sites: evacuationCenters.length,
        alerts: evacuationAlerts,
      },
      hazardMapping: {
        barangays: barangays.length,
        floodProne: barangays.filter((b) => b.isFloodProne).length,
        activeFloodFlags: barangays.filter((b) => b.opsFloodActive).length,
        activeRedZone: barangays.filter((b) => b.opsRedZoneActive).length,
      },
      intelligence: {
        riskMatrix: riskMatrix.map((r) => ({
          barangayId: r.barangayId,
          code: barangays.find((b) => b.id === r.barangayId)?.code ?? '',
          name: r.name,
          score: r.score,
          level: r.level,
          factors: r.factors ?? [],
          engine: r.engine,
        })),
        rainOutlook: weatherSituation?.rainOutlook6h ?? null,
        heatmapPoints,
        nlpReady: true,
      },
      communications: {
        recentAudit: recentAudit.map((a) => ({
          id: a.id,
          at: a.createdAt,
          action: a.action,
          actor: a.actor?.email ?? 'system',
          role: a.actor?.role ?? null,
        })),
        smsRecent,
        notificationRecent,
      },
      federation: {
        ssoEnabled: Boolean(process.env.OIDC_ISSUER_URL?.trim()),
        provider: process.env.OIDC_ISSUER_URL ? 'oidc' : 'local-jwt',
      },
    };
  }

  async dispatchSuggestions(actor: JwtPayload, incidentId: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      include: { barangay: true },
    });
    if (!incident) throw new NotFoundException('Incident not found');

    const lat = Number(incident.latitude);
    const lon = Number(incident.longitude);

    const responders = await this.prisma.responder.findMany({
      where: {
        status: { in: [ResponderStatus.AVAILABLE, ResponderStatus.DISPATCHED] },
      },
      include: {
        user: { select: { email: true } },
        vehicle: true,
        locations: { orderBy: { recordedAt: 'desc' }, take: 1 },
      },
      take: 80,
    });

    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        isActive: true,
        fleetStatus: { in: [VehicleFleetStatus.AVAILABLE, VehicleFleetStatus.DEPLOYED] },
        latitude: { not: null },
        longitude: { not: null },
      },
      take: 40,
    });

    const rankedResponders = responders
      .map((r) => {
        const loc = r.locations[0];
        const rLat = loc ? Number(loc.latitude) : null;
        const rLon = loc ? Number(loc.longitude) : null;
        const km =
          rLat != null && rLon != null ? haversineKm(lat, lon, rLat, rLon) : 999;
        return {
          responderId: r.id,
          email: r.user.email,
          status: r.status,
          badgeNumber: r.badgeNumber,
          vehicle: r.vehicle?.plateNumber ?? null,
          distanceKm: Math.round(km * 10) / 10,
          etaMin: rLat != null ? estimateDriveMin(km) : null,
          hasLiveGps: loc != null,
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 8);

    const rankedVehicles = vehicles
      .map((v) => {
        const km = haversineKm(lat, lon, Number(v.latitude), Number(v.longitude));
        return {
          vehicleId: v.id,
          plateNumber: v.plateNumber,
          type: v.type,
          fleetStatus: v.fleetStatus,
          distanceKm: Math.round(km * 10) / 10,
          etaMin: estimateDriveMin(km),
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 6);

    return {
      incidentId,
      incident: {
        type: incident.type,
        status: incident.status,
        latitude: lat,
        longitude: lon,
        barangay: incident.barangay?.name ?? null,
      },
      suggestedResponders: rankedResponders,
      suggestedVehicles: rankedVehicles,
      algorithm: 'haversine-nearest-unit',
      note: 'Rule-based dispatch suggestions; confirm with dispatcher before assignment.',
    };
  }

  async classifyReportText(body: string) {
    const text = body.toLowerCase();
    const rules: Array<{ type: string; keywords: string[] }> = [
      { type: 'FLOOD', keywords: ['baha', 'flood', 'tubig', 'flash'] },
      { type: 'FIRE', keywords: ['sunog', 'fire', 'apoy'] },
      { type: 'MEDICAL_EMERGENCY', keywords: ['sakit', 'medical', 'ambulansya', 'hospital'] },
      { type: 'LANDSLIDE', keywords: ['landslide', 'guho', 'mudslide'] },
      { type: 'TYPHOON', keywords: ['bagyo', 'typhoon', 'storm'] },
      { type: 'RESCUE_REQUEST', keywords: ['rescue', 'saklol', 'trapped', 'stuck'] },
    ];
    let best = { type: 'OTHER', hits: 0 };
    for (const r of rules) {
      const hits = r.keywords.filter((k) => text.includes(k)).length;
      if (hits > best.hits) best = { type: r.type, hits };
    }
    const critical = ['patay', 'dead', 'critical', 'urgent', 'sos', 'help'].some((k) =>
      text.includes(k),
    );
    return {
      suggestedType: best.type,
      confidence: best.hits > 0 ? Math.min(0.95, 0.45 + best.hits * 0.2) : 0.2,
      isCritical: critical,
      engine: 'keyword-nlp-v1',
    };
  }
}
