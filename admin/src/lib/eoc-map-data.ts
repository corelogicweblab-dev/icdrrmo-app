import type { EocWeatherBundle } from "@/lib/eoc-weather";
import type { HazardGeoJsonFeature, MergedHazardGeoJson, PagasaAdvisoryRow } from "@/lib/eoc-weather-geojson";
import { pagasaAdvisoriesFromGeoJson } from "@/lib/eoc-weather-geojson";
import { ISABELA_CITY_LAT, ISABELA_CITY_LON } from "@/lib/isabela-forecast-embed";

export function pagasaRowsFromWeather(wx: EocWeatherBundle | null): PagasaAdvisoryRow[] {
  if (!wx?.pagasa.items.length) return [];
  return wx.pagasa.items.map((a) => ({
    id: a.id,
    title: a.title,
    link: a.link,
    summary: a.summary,
    kind: wx.pagasa.source,
  }));
}

export function mergePagasaAdvisories(
  geo: MergedHazardGeoJson | null,
  wx: EocWeatherBundle | null,
): PagasaAdvisoryRow[] {
  const fromGeo = pagasaAdvisoriesFromGeoJson(geo);
  if (fromGeo.length > 0) return fromGeo;
  return pagasaRowsFromWeather(wx);
}

export function tileLayersFromWeather(wx: EocWeatherBundle | null): Array<{
  id: string;
  label: string;
  urlTemplate: string;
}> {
  return (wx?.openWeather.layers ?? []).filter(
    (l) =>
      !l.urlTemplate.includes("/weather/tiles/") &&
      !l.urlTemplate.includes("tiles.windy.com"),
  );
}

export function applyOpenMeteoPagasaHint(
  geo: MergedHazardGeoJson | null,
  openMeteo: { weatherLabel: string; headline: string } | null,
): MergedHazardGeoJson | null {
  if (!openMeteo || (geo?.layers.pagasa.features.length ?? 0) > 0) return geo;
  return applyPagasaWeatherToGeo(geo, {
    pagasa: {
      source: "Open-Meteo (browser)",
      fetchedAt: new Date().toISOString(),
      items: [
        {
          id: "open-meteo-live",
          title: openMeteo.weatherLabel,
          link: "https://open-meteo.com/",
          pubDate: "",
          summary: openMeteo.headline,
        },
      ],
    },
  } as EocWeatherBundle);
}

export function applyPagasaWeatherToGeo(
  geo: MergedHazardGeoJson | null,
  wx: EocWeatherBundle | null,
): MergedHazardGeoJson | null {
  if (!wx?.pagasa.items.length) return geo;
  if (geo && geo.layers.pagasa.features.length > 0) return geo;
  const features: HazardGeoJsonFeature[] = wx.pagasa.items.map((item, i) => ({
    type: "Feature",
    id: `pagasa-wx:${item.id}`,
    geometry: {
      type: "Point",
      coordinates: [ISABELA_CITY_LON + i * 0.015, ISABELA_CITY_LAT + i * 0.008],
    },
    properties: {
      source: "pagasa",
      kind: "rss-advisory",
      title: item.title,
      link: item.link,
      summary: item.summary,
      excerpt: item.summary,
    },
  }));
  const base: MergedHazardGeoJson = geo ?? {
    type: "FeatureCollection",
    generatedAt: new Date().toISOString(),
    properties: {
      aoiLabel: "Isabela City",
      bbox: [121.75, 6.55, 122.25, 6.85],
      sources: ["pagasa-weather-bundle"],
      upstreamErrors: {},
    },
    layers: {
      openWeatherMap: { type: "FeatureCollection", features: [] },
      gdacs: { type: "FeatureCollection", features: [] },
      pagasa: { type: "FeatureCollection", features: [] },
    },
    features: [],
  };
  return {
    ...base,
    layers: { ...base.layers, pagasa: { type: "FeatureCollection", features } },
    features: [...base.features, ...features],
  };
}

export function applyClientGdacsToGeo(
  geo: MergedHazardGeoJson | null,
  clientFeatures: HazardGeoJsonFeature[],
): MergedHazardGeoJson | null {
  if (!clientFeatures.length) return geo;
  if (geo && geo.layers.gdacs.features.length > 0) return geo;
  const base: MergedHazardGeoJson = geo ?? {
    type: "FeatureCollection",
    generatedAt: new Date().toISOString(),
    properties: {
      aoiLabel: "Philippines",
      bbox: [116, 4, 127, 21],
      sources: ["gdacs-client"],
      upstreamErrors: {},
    },
    layers: {
      openWeatherMap: { type: "FeatureCollection", features: [] },
      gdacs: { type: "FeatureCollection", features: [] },
      pagasa: { type: "FeatureCollection", features: [] },
    },
    features: [],
  };
  return {
    ...base,
    layers: {
      ...base.layers,
      gdacs: {
        type: "FeatureCollection",
        features: clientFeatures,
        properties: { source: "gdacs", via: "client-fallback" },
      },
    },
    features: [...base.features, ...clientFeatures],
  };
}
