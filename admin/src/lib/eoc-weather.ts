import { opsFetchJson } from "@/lib/ops-api";
import type { MergedHazardGeoJson } from "@/lib/eoc-weather-geojson";

export type EocWeatherBundle = {
  situation: {
    current: {
      temperatureC: number | null;
      weatherLabel: string;
      humidityPct: number | null;
      windSpeedKmh?: number | null;
      windDirectionDeg?: number | null;
    };
    rainOutlook6h: { headline: string; willRainLikely: boolean; maxPrecipProbPct: number };
  };
  pagasa: {
    source: string;
    fetchedAt: string;
    items: Array<{ id: string; title: string; link: string; pubDate: string; summary: string }>;
    upstreamError?: string;
  };
  openWeather: {
    configured: boolean;
    provider?: string;
    layers: Array<{ id: string; label: string; urlTemplate: string }>;
    openMeteoOverlays?: Array<'temp' | 'wind'>;
  };
  rainViewer?: { available: boolean };
  hazardGeo?: MergedHazardGeoJson;
};

export async function fetchEocWeather(accessToken: string): Promise<EocWeatherBundle> {
  return opsFetchJson<EocWeatherBundle>("/weather", accessToken);
}
