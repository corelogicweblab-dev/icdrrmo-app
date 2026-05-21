import { opsFetchJson } from "@/lib/ops-api";
import type { MergedHazardGeoJson } from "@/lib/eoc-weather-geojson";

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
  const q =
    coords != null ? `?lat=${coords.lat}&lng=${coords.lng}` : "";
  return opsFetchJson<CitizenUnifiedFeed>(`/citizen/feed${q}`, token);
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
