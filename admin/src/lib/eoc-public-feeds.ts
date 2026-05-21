import { ISABELA_CITY_LAT, ISABELA_CITY_LON } from "@/lib/isabela-forecast-embed";

/** RainViewer radar native zoom cap — higher z shows "Zoom Level Not Supported". */
export const RAINVIEWER_MAX_NATIVE_ZOOM = 7;

export type ClientOpenMeteo = {
  temperatureC: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  weatherLabel: string;
  headline: string;
};

export async function fetchRainViewerTileUrl(): Promise<string | null> {
  try {
    const res = await fetch("https://api.rainviewer.com/public/weather-maps.json", {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { radar?: { past?: Array<{ path: string }> } };
    const path = data.radar?.past?.[data.radar.past.length - 1]?.path;
    if (!path) return null;
    const normalized = path.startsWith("/") ? path : `/v2/radar/${path}`;
    return `https://tilecache.rainviewer.com${normalized}/256/{z}/{x}/{y}/2/1_1.png`;
  } catch {
    return null;
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
