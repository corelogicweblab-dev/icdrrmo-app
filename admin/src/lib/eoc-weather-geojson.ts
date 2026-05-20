import { opsFetchJson } from "@/lib/ops-api";

export type HazardGeoJsonFeature = {
  type: "Feature";
  id?: string;
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
  properties: Record<string, unknown>;
};

export type HazardGeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: HazardGeoJsonFeature[];
  properties?: Record<string, unknown>;
};

export type MergedHazardGeoJson = {
  type: "FeatureCollection";
  generatedAt: string;
  properties: {
    aoiLabel: string;
    bbox: [number, number, number, number];
    sources: string[];
    upstreamErrors: Record<string, string | undefined>;
  };
  layers: {
    openWeatherMap: HazardGeoJsonFeatureCollection;
    gdacs: HazardGeoJsonFeatureCollection;
    pagasa: HazardGeoJsonFeatureCollection;
  };
  features: HazardGeoJsonFeature[];
};

export type PagasaAdvisoryRow = {
  id: string;
  title: string;
  link: string;
  summary: string;
  kind: string;
};

export async function fetchEocHazardGeoJson(accessToken: string): Promise<MergedHazardGeoJson> {
  return opsFetchJson<MergedHazardGeoJson>("/weather/geojson", accessToken);
}

export function pagasaAdvisoriesFromGeoJson(geo: MergedHazardGeoJson | null): PagasaAdvisoryRow[] {
  if (!geo) return [];
  return geo.layers.pagasa.features.map((f, i) => {
    const p = f.properties;
    return {
      id: String(f.id ?? `pagasa-${i}`),
      title: String(p.title ?? "PAGASA advisory"),
      link: String(p.link ?? ""),
      summary: String(p.excerpt ?? p.summary ?? ""),
      kind: String(p.kind ?? "advisory"),
    };
  });
}

export function owmTileLayersFromGeoJson(geo: MergedHazardGeoJson | null): Array<{
  id: string;
  label: string;
  urlTemplate: string;
}> {
  if (!geo) return [];
  return geo.layers.openWeatherMap.features
    .filter((f) => f.properties.kind === "raster-tile-layer")
    .map((f) => ({
      id: String(f.properties.layerId ?? ""),
      label: String(f.properties.label ?? f.properties.layerId ?? "Layer"),
      urlTemplate: String(f.properties.urlTemplate ?? ""),
    }))
    .filter((l) => l.id && l.urlTemplate);
}

export function gdacsAlertColor(level: string): string {
  const l = level.toLowerCase();
  if (l.includes("red")) return "#ef4444";
  if (l.includes("orange")) return "#f97316";
  if (l.includes("green")) return "#22c55e";
  return "#eab308";
}
