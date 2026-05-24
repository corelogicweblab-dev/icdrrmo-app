import { getApiBaseUrl } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/api-fetch";

export type AgencyDashboardStats = {
  agency: string;
  stats: { open: number; dispatched: number; resolvedToday: number };
};

export type AgencyIncidentRow = {
  id: string;
  type: string;
  status: string;
  urgencyLevel: string;
  title: string | null;
  description: string | null;
  latitude: number;
  longitude: number;
  createdAt: string;
  routedAgency: string | null;
  barangay: { name: string; code: string } | null;
  reporter: {
    email: string;
    phone: string | null;
    profile: { fullName: string; streetPurok: string | null } | null;
  } | null;
};

async function agencyFetch<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetchWithTimeout(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) {
    throw new Error(typeof data.message === "string" ? data.message : `Request failed (${res.status})`);
  }
  return data;
}

export function fetchAgencyDashboard(accessToken: string): Promise<AgencyDashboardStats> {
  return agencyFetch(accessToken, "/agency/dashboard");
}

export function fetchAgencyIncidents(accessToken: string): Promise<AgencyIncidentRow[]> {
  return agencyFetch(accessToken, "/agency/incidents");
}

export function triggerAgencyCall(
  accessToken: string,
  body: { target: "BFP" | "PNP" | "CHAIRMAN"; incidentId?: string; message?: string },
): Promise<{ callId: string; target: string }> {
  return agencyFetch(accessToken, "/agency/call", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function ackAgencyCall(accessToken: string, callId: string): Promise<{ ok: true }> {
  return agencyFetch(accessToken, `/agency/call/${encodeURIComponent(callId)}/ack`, {
    method: "POST",
    body: "{}",
  });
}
