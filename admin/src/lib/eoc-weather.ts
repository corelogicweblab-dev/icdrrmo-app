import { opsFetchJson } from "@/lib/ops-api";

export type EocWeatherBundle = {
  situation: {
    current: {
      temperatureC: number | null;
      weatherLabel: string;
      humidityPct: number | null;
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
    layers: Array<{ id: string; label: string; urlTemplate: string }>;
  };
  rainViewer?: { available: boolean };
};

export async function fetchEocWeather(accessToken: string): Promise<EocWeatherBundle> {
  return opsFetchJson<EocWeatherBundle>("/weather", accessToken);
}
