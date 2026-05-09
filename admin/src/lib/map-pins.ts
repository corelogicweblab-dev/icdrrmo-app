import type { OpsIncident } from "@/components/ops/ops-types";

export type MapIncidentPin = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  type: string;
};

export function incidentsToMapPins(rows: OpsIncident[]): MapIncidentPin[] {
  return rows
    .filter((r) => r.latitude != null && r.longitude != null && r.id)
    .map((r) => ({
      id: r.id,
      lat: Number(r.latitude),
      lng: Number(r.longitude),
      label: (r.title ?? r.type ?? r.id).replace(/_/g, " ").slice(0, 72),
      type: r.type,
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}
