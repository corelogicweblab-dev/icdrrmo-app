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

/** GeoJSON for Mapbox sources (heatmap / cluster). */
export function pinsToFeatureCollection(pins: MapIncidentPin[]): {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: { id: string; label: string; incidentType: string };
  }>;
} {
  return {
    type: "FeatureCollection",
    features: pins.map((p) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] as [number, number] },
      properties: { id: p.id, label: p.label, incidentType: p.type },
    })),
  };
}
