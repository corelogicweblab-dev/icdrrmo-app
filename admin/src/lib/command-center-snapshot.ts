import { API_INCIDENTS_QUEUE_PATH } from "@/lib/ops-api-paths";
import { opsFetchJson, OpsApiError } from "@/lib/ops-api";
import type { OpsIncident } from "@/components/ops/ops-types";

export type CommandCenterSnapshot = {
  generatedAt: string;
  readOnly: boolean;
  summary: {
    openIncidents: number;
    activeResponders: number;
    activeVehicles: number;
    evacuationSites: number;
    operatorBarangayMissing?: boolean;
    message?: string;
  };
  liveIncidents: Array<{
    id: string;
    type: string;
    status: string;
    isCritical: boolean;
    urgency: "critical" | "high" | "moderate";
    createdAt: string;
    barangay: { name: string } | null;
    assignedEmail: string | null;
  }>;
  resources: {
    vehicles: { available: number; deployed: number; maintenance: number };
    responders: { available: number; onMission: number; offDuty: number };
  };
  evacuation: {
    sites: number;
    alerts: Array<{ name: string; occupancyPct: number | null; alert: string }>;
  };
  intelligence: {
    rainOutlook: { headline: string; willRainLikely: boolean } | null;
    riskMatrix: Array<{
      name: string;
      score: number;
      level: string;
      factors?: string[];
      engine?: string;
    }>;
    heatmapPoints: Array<{ id: string; lat: number; lon: number; weight: number }>;
  };
  communications: {
    recentAudit: Array<{ id: string; at: string; action: string; actor: string }>;
  };
  federation: { ssoEnabled: boolean; provider: string };
};

type DashboardSummary = {
  openIncidents?: number;
  activeResponders?: number;
  activeVehicles?: number;
  evacuationSites?: number;
  operatorBarangayMissing?: boolean;
  message?: string;
};

type BarangayRow = {
  id: string;
  name: string;
  isFloodProne?: boolean;
  opsFloodActive?: boolean;
  opsRedZoneActive?: boolean;
};

type AuditList = { items?: Array<{ id: string; createdAt: string; action: string; actor?: { email: string } | null }> };

const SNAPSHOT_PATHS = [
  "/command-center/snapshot",
  "/dashboard/command-center-snapshot",
] as const;

function urgencyFor(inc: OpsIncident): "critical" | "high" | "moderate" {
  if (inc.status === "OPEN") return "high";
  return "moderate";
}

function normalizeSummary(raw: DashboardSummary): CommandCenterSnapshot["summary"] {
  return {
    openIncidents: Number(raw.openIncidents ?? 0),
    activeResponders: Number(raw.activeResponders ?? 0),
    activeVehicles: Number(raw.activeVehicles ?? 0),
    evacuationSites: Number(raw.evacuationSites ?? 0),
  };
}

function queueToLiveIncidents(queue: OpsIncident[]): CommandCenterSnapshot["liveIncidents"] {
  return queue.map((i) => ({
    id: i.id,
    type: i.type,
    status: i.status,
    isCritical: false,
    urgency: urgencyFor(i),
    createdAt: i.createdAt,
    barangay: null,
    assignedEmail: i.assigned?.user.email ?? null,
  }));
}

function heatmapFromQueue(queue: OpsIncident[]): CommandCenterSnapshot["intelligence"]["heatmapPoints"] {
  return queue
    .filter((i) => i.latitude != null && i.longitude != null)
    .map((i) => ({
      id: i.id,
      lat: Number(i.latitude),
      lon: Number(i.longitude),
      weight: 1,
    }));
}

function ruleBasedRiskMatrix(barangays: BarangayRow[]): CommandCenterSnapshot["intelligence"]["riskMatrix"] {
  return barangays.slice(0, 20).map((b) => {
    let score = 0;
    if (b.isFloodProne) score += 25;
    if (b.opsFloodActive) score += 35;
    if (b.opsRedZoneActive) score += 40;
    score = Math.min(100, score);
    const level =
      score >= 75 ? "critical" : score >= 50 ? "high" : score >= 30 ? "moderate" : "routine";
    return { name: b.name, score, level, engine: "rules-fallback" };
  });
}

async function buildLegacySnapshot(accessToken: string): Promise<CommandCenterSnapshot> {
  const [summary, queue, barangays, audit, oidcStatus] = await Promise.all([
    opsFetchJson<DashboardSummary>("/dashboard/summary", accessToken),
    opsFetchJson<OpsIncident[]>(API_INCIDENTS_QUEUE_PATH, accessToken),
    opsFetchJson<BarangayRow[]>("/barangays", accessToken).catch(() => [] as BarangayRow[]),
    opsFetchJson<AuditList>("/audit-logs?take=8", accessToken).catch(() => ({ items: [] })),
    opsFetchJson<{ enabled?: boolean }>("/auth/oidc/status", accessToken).catch(() => ({ enabled: false })),
  ]);

  const live = queueToLiveIncidents(Array.isArray(queue) ? queue : []);

  return {
    generatedAt: new Date().toISOString(),
    readOnly: false,
    summary: {
      ...normalizeSummary(summary),
      ...(summary.operatorBarangayMissing
        ? { operatorBarangayMissing: true, message: summary.message }
        : {}),
    },
    liveIncidents: live,
    resources: {
      vehicles: {
        available: Number(summary.activeVehicles ?? 0),
        deployed: 0,
        maintenance: 0,
      },
      responders: {
        available: Number(summary.activeResponders ?? 0),
        onMission: 0,
        offDuty: 0,
      },
    },
    evacuation: { sites: Number(summary.evacuationSites ?? 0), alerts: [] },
    intelligence: {
      rainOutlook: null,
      riskMatrix: ruleBasedRiskMatrix(Array.isArray(barangays) ? barangays : []),
      heatmapPoints: heatmapFromQueue(Array.isArray(queue) ? queue : []),
    },
    communications: {
      recentAudit: (audit.items ?? []).map((a) => ({
        id: a.id,
        at: a.createdAt,
        action: a.action,
        actor: a.actor?.email ?? "system",
      })),
    },
    federation: {
      ssoEnabled: Boolean(oidcStatus.enabled),
      provider: oidcStatus.enabled ? "oidc" : "local-jwt",
    },
  };
}

function normalizeApiSnapshot(raw: Record<string, unknown>): CommandCenterSnapshot {
  const summaryRaw = (raw.summary ?? {}) as DashboardSummary;
  const intel = (raw.intelligence ?? {}) as CommandCenterSnapshot["intelligence"];
  const comms = (raw.communications ?? {}) as CommandCenterSnapshot["communications"];
  const evac = (raw.evacuation ?? {}) as CommandCenterSnapshot["evacuation"];
  const resources = (raw.resources ?? {}) as CommandCenterSnapshot["resources"];

  return {
    generatedAt: String(raw.generatedAt ?? new Date().toISOString()),
    readOnly: Boolean(raw.readOnly),
    summary: normalizeSummary(summaryRaw),
    liveIncidents: (raw.liveIncidents as CommandCenterSnapshot["liveIncidents"]) ?? [],
    resources: {
      vehicles: resources.vehicles ?? { available: 0, deployed: 0, maintenance: 0 },
      responders: resources.responders ?? { available: 0, onMission: 0, offDuty: 0 },
    },
    evacuation: evac.sites != null ? evac : { sites: 0, alerts: [] },
    intelligence: {
      rainOutlook: intel.rainOutlook ?? null,
      riskMatrix: intel.riskMatrix ?? [],
      heatmapPoints: intel.heatmapPoints ?? [],
    },
    communications: {
      recentAudit: comms.recentAudit ?? [],
    },
    federation: (raw.federation as CommandCenterSnapshot["federation"]) ?? {
      ssoEnabled: false,
      provider: "local-jwt",
    },
  };
}

export type CommandCenterLoadResult = {
  snapshot: CommandCenterSnapshot;
  /** True when legacy dashboard/queue endpoints were used (API not yet on latest deploy). */
  usedLegacyFallback: boolean;
};

export async function loadCommandCenterSnapshot(
  accessToken: string,
): Promise<CommandCenterLoadResult> {
  for (const path of SNAPSHOT_PATHS) {
    try {
      const raw = await opsFetchJson<Record<string, unknown>>(path, accessToken);
      return { snapshot: normalizeApiSnapshot(raw), usedLegacyFallback: false };
    } catch (e: unknown) {
      if (e instanceof OpsApiError && e.status === 404) continue;
      throw e;
    }
  }

  const snapshot = await buildLegacySnapshot(accessToken);
  return { snapshot, usedLegacyFallback: true };
}

export type DispatchSuggestions = {
  incidentId: string;
  suggestedResponders: Array<{
    responderId: string;
    email: string;
    status: string;
    distanceKm: number;
    etaMin: number | null;
    vehicle: string | null;
  }>;
  suggestedVehicles: Array<{
    vehicleId: string;
    plateNumber: string;
    type: string | null;
    distanceKm: number;
    etaMin: number;
  }>;
};

const DISPATCH_PATHS = (incidentId: string) =>
  [
    `/command-center/dispatch/suggestions?incidentId=${encodeURIComponent(incidentId)}`,
    `/dashboard/dispatch/suggestions?incidentId=${encodeURIComponent(incidentId)}`,
  ] as const;

export async function loadDispatchSuggestions(
  accessToken: string,
  incidentId: string,
): Promise<DispatchSuggestions | null> {
  for (const path of DISPATCH_PATHS(incidentId)) {
    try {
      return await opsFetchJson<DispatchSuggestions>(path, accessToken);
    } catch (e: unknown) {
      if (e instanceof OpsApiError && e.status === 404) continue;
      throw e;
    }
  }
  return null;
}
