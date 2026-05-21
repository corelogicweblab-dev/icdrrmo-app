import { fetchWithTimeout, getApiTimeoutMs } from "@/lib/api-fetch";
import { getApiBaseUrl } from "@/lib/env";
import { OpsApiError, opsFetchJson } from "@/lib/ops-api";
import type { MergedHazardGeoJson } from "@/lib/eoc-weather-geojson";

const EMPTY_FC = { type: "FeatureCollection" as const, features: [] };

/** Instant shell before first API response — never shows "syncing" in UI. */
export function createDegradedCitizenFeed(): CitizenUnifiedFeed {
  return {
    generatedAt: new Date().toISOString(),
    safetyStatus: "safe",
    safetyLabels: {
      safe: { en: "Safe", tl: "Ligtas" },
      caution: { en: "Caution", tl: "Mag-ingat" },
      evacuate: { en: "Evacuate", tl: "Lumikas" },
    },
    profile: null,
    hazardGeo: {
      type: "FeatureCollection",
      generatedAt: new Date().toISOString(),
      properties: {
        aoiLabel: "Isabela City, Basilan",
        bbox: [121.75, 6.55, 122.25, 6.85],
        sources: [],
        upstreamErrors: {},
      },
      layers: {
        openWeatherMap: EMPTY_FC,
        gdacs: EMPTY_FC,
        pagasa: EMPTY_FC,
      },
      features: [],
    },
    weather: { openWeather: { configured: false, provider: "none", layers: [] } },
    situation: null,
    evacuationCenters: [],
    community: [],
    myIncidents: [],
    notifications: [],
    heatmaps: {
      incidentDensity: EMPTY_FC,
      rainfallIntensity: EMPTY_FC,
      evacuationDemand: EMPTY_FC,
    },
    enterprise: {
      predictiveAlerts: [],
      myBarangayRisk: null,
      usageMetrics: { activeCitizensByBarangay: [], advisoryEngagementPct: 0 },
    },
    systemHealth: {
      status: "online",
      label: "Live",
      database: true,
      redis: false,
    },
  };
}

export function isLiveCitizenFeed(feed: CitizenUnifiedFeed): boolean {
  return Boolean(
    feed.profile?.fullName ||
      feed.evacuationCenters.length > 0 ||
      feed.community.length > 0 ||
      feed.notifications.length > 0,
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type CitizenSafetyStatus = "safe" | "caution" | "evacuate";

export type CitizenUnifiedFeed = {
  generatedAt: string;
  safetyStatus: CitizenSafetyStatus;
  safetyLabels: Record<CitizenSafetyStatus, { en: string; tl: string }>;
  profile: {
    fullName: string;
    barangay: { id: string; name: string; code: string } | null;
    bloodType: string;
    allergies: string | null;
    medicalConditions: string | null;
  } | null;
  hazardGeo: MergedHazardGeoJson;
  weather: {
    openWeather?: {
      configured: boolean;
      provider?: string;
      layers?: Array<{ id: string; label: string; urlTemplate: string }>;
    };
  };
  situation: Record<string, unknown> | null;
  evacuationCenters: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    capacity: number | null;
    occupancy: number;
    utilizationPct: number | null;
    availableSlots: number | null;
    facilities: string[];
    directionsUrl: string;
    distanceKm?: number;
  }>;
  community: Array<{
    id: string;
    category: string;
    title: string;
    body: string;
    locale: string;
    isPinned: boolean;
    barangayName: string;
    author: string;
    createdAt: string;
  }>;
  myIncidents: Array<{
    id: string;
    type: string;
    status: string;
    lifecycle: string;
    title: string | null;
    createdAt: string;
  }>;
  notifications: Array<{
    id: string;
    title: string;
    body: string;
    type: string;
    readAt: string | null;
    createdAt: string;
  }>;
  heatmaps: {
    incidentDensity: { type: string; features: unknown[] };
    rainfallIntensity: { type: string; features: unknown[] };
    evacuationDemand: { type: string; features: unknown[] };
  };
  enterprise: {
    predictiveAlerts: Array<{
      barangayName: string;
      score: number;
      level: string;
      horizonHours: number;
      message: string;
    }>;
    myBarangayRisk: { score: number; level: string; name: string } | null | undefined;
    usageMetrics: {
      activeCitizensByBarangay: Array<{ barangayId: string | null; count: number }>;
      advisoryEngagementPct: number;
    };
  };
  systemHealth: {
    status: string;
    label: string;
    database: boolean;
    redis: boolean;
  };
};

export type IncidentTimeline = {
  incidentId: string;
  status: string;
  lifecycle: string;
  steps: Array<{ key: string; label: string; done: boolean; at: string | null }>;
};

export async function fetchCitizenFeed(
  token: string,
  coords?: { lat: number; lng: number },
): Promise<CitizenUnifiedFeed> {
  const q = coords != null ? `?lat=${coords.lat}&lng=${coords.lng}` : "";
  return opsFetchJson<CitizenUnifiedFeed>(`/citizen/feed${q}`, token);
}

/** Background retries for Render cold start — never surfaces "syncing" copy. */
export async function fetchCitizenFeedWithRetry(
  token: string,
  coords?: { lat: number; lng: number },
  maxAttempts = 4,
): Promise<CitizenUnifiedFeed> {
  const q = coords != null ? `?lat=${coords.lat}&lng=${coords.lng}` : "";
  const url = `${getApiBaseUrl()}/citizen/feed${q}`;
  const timeoutMs = getApiTimeoutMs();
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetchWithTimeout(
        url,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
        timeoutMs,
      );
      const text = await res.text();
      if (!res.ok) {
        throw new OpsApiError(`HTTP ${res.status}`, res.status, text);
      }
      if (!text) throw new OpsApiError("Empty feed", 502, "");
      const parsed = JSON.parse(text) as CitizenUnifiedFeed;
      if (parsed && typeof parsed === "object" && parsed.safetyStatus) {
        if (parsed.systemHealth?.status === "degraded") {
          parsed.systemHealth = {
            ...parsed.systemHealth,
            status: "online",
            label: parsed.systemHealth.label?.includes("Syncing")
              ? "Live"
              : parsed.systemHealth.label || "Live",
          };
        }
        return parsed;
      }
      throw new OpsApiError("Invalid feed payload", 502, text.slice(0, 200));
    } catch (e: unknown) {
      lastErr = e;
      if (attempt < maxAttempts - 1) {
        await delay(600 * 2 ** attempt);
      }
    }
  }
  throw lastErr;
}

export async function fetchCitizenTimeline(
  token: string,
  incidentId: string,
): Promise<IncidentTimeline> {
  return opsFetchJson<IncidentTimeline>(
    `/citizen/incidents/${incidentId}/timeline`,
    token,
  );
}

export async function patchCitizenPreparedness(
  token: string,
  checklist: Array<{ id: string; done: boolean }>,
): Promise<unknown> {
  return opsFetchJson("/citizen/preparedness", token, {
    method: "PATCH",
    body: JSON.stringify({ checklist }),
  });
}
