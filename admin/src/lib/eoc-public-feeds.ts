import { ISABELA_CITY_LAT, ISABELA_CITY_LON } from "@/lib/isabela-forecast-embed";
import { fetchWithTimeout } from "@/lib/api-fetch";
import { getApiBaseUrl } from "@/lib/env";
import type { MergedHazardGeoJson } from "@/lib/eoc-weather-geojson";

/** RainViewer radar native zoom cap — higher z shows "Zoom Level Not Supported". */
export const RAINVIEWER_MAX_NATIVE_ZOOM = 7;

export type ClientOpenMeteo = {
  temperatureC: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  weatherLabel: string;
  headline: string;
};

export async function fetchPublicHazardGeoJson(): Promise<MergedHazardGeoJson | null> {
  const url = `${getApiBaseUrl().replace(/\/$/, "")}/weather/public/hazards`;
  try {
    const res = await fetchWithTimeout(url, { method: "GET", cache: "no-store" }, 25_000);
    if (!res.ok) return null;
    return (await res.json()) as MergedHazardGeoJson;
  } catch {
    return null;
  }
}

export async function fetchRainViewerTileUrl(): Promise<string | null> {
  const layers = await fetchRainViewerTileLayers();
  const rain =
    layers.find((l) => l.id === "rain-radar")?.urlTemplate ??
    layers.find((l) => l.id === "precipitation")?.urlTemplate ??
    null;
  return rain;
}

export async function fetchRainViewerTileLayers(): Promise<
  Array<{ id: string; label: string; urlTemplate: string }>
> {
  try {
    const res = await fetch("https://api.rainviewer.com/public/weather-maps.json", {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      radar?: { past?: Array<{ path: string }> };
      satellite?: { infrared?: { past?: Array<{ path: string }> } };
    };
    const radarPath = data.radar?.past?.[data.radar.past.length - 1]?.path;
    const satPath = data.satellite?.infrared?.past?.[
      (data.satellite?.infrared?.past?.length ?? 1) - 1
    ]?.path;

    const layers: Array<{ id: string; label: string; urlTemplate: string }> = [];
    if (radarPath) {
      const normalized = radarPath.startsWith("/") ? radarPath : `/v2/radar/${radarPath}`;
      const radarTpl = `https://tilecache.rainviewer.com${normalized}/256/{z}/{x}/{y}/2/1_1.png`;
      layers.push({ id: "rain-radar", label: "Rain radar (live)", urlTemplate: radarTpl });
      layers.push({ id: "precipitation", label: "Rain / precipitation", urlTemplate: radarTpl });
    }
    if (satPath) {
      layers.push({
        id: "clouds",
        label: "Clouds / IR satellite",
        urlTemplate: `https://tilecache.rainviewer.com${satPath}/256/{z}/{x}/{y}/0/0_0.png`,
      });
    } else if (radarPath) {
      const normalized = radarPath.startsWith("/") ? radarPath : `/v2/radar/${radarPath}`;
      layers.push({
        id: "clouds",
        label: "Clouds (radar composite)",
        urlTemplate: `https://tilecache.rainviewer.com${normalized}/256/{z}/{x}/{y}/2/1_0.png`,
      });
    }
    return layers;
  } catch {
    return [];
  }
}

export async function fetchOpenMeteoClient(): Promise<ClientOpenMeteo | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${ISABELA_CITY_LAT}&longitude=${ISABELA_CITY_LON}` +
    "&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m" +
    "&timezone=Asia%2FManila";
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      current?: {
        temperature_2m?: number;
        weather_code?: number;
        wind_speed_10m?: number;
        wind_direction_10m?: number;
      };
    };
    const c = data.current;
    if (!c) return null;
    const code = c.weather_code;
    const label =
      code === 0
        ? "Clear"
        : code != null && code <= 3
          ? "Partly cloudy"
          : code != null && code >= 61
            ? "Rain likely"
            : "Cloudy";
    return {
      temperatureC: c.temperature_2m ?? null,
      windSpeedKmh: c.wind_speed_10m != null ? Math.round(c.wind_speed_10m * 10) / 10 : null,
      windDirectionDeg:
        c.wind_direction_10m != null ? Math.round(c.wind_direction_10m) : null,
      weatherLabel: label,
      headline: `Open-Meteo (browser): ${label}`,
    };
  } catch {
    return null;
  }
}
