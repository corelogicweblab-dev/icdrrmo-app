import { fetchWithTimeout } from "@/lib/api-fetch";
import { getApiBaseUrl } from "@/lib/env";
import { fetchEocWeather } from "@/lib/eoc-weather";

/** Shown on Leaflet — never "Windy" branding. */
export const ICDRRMO_WEATHER_ATTRIBUTION = "ICDRRMO · Live weather layers";

export type WindyTileLayer = { id: string; label: string; urlTemplate: string };

export type WindyLayersResponse = {
  configured: boolean;
  provider: string;
  layers: WindyTileLayer[];
};

/** Dark basemap — no third-party weather logo. */
export const WINDY_STYLE_BASEMAP_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

export const WINDY_STYLE_BASEMAP_ATTRIBUTION = "ICDRRMO · Basemap";

/** ICDRRMO API proxy or legacy direct Windy host. */
export function isWindyTileUrl(url: string): boolean {
  return url.includes("/weather/tiles/") || url.includes("tiles.windy.com");
}

/** Map desk overlay keys (rain, wind, …) to API layer ids. */
export function overlayToLayerId(overlay: string): string {
  const key = overlay.toLowerCase();
  const map: Record<string, string> = {
    rain: "rain-radar",
    "rain-radar": "rain-radar",
    precipitation: "precipitation",
    clouds: "clouds",
    cloud: "clouds",
    lclouds: "clouds",
    temp: "temp",
    temperature: "temp",
    wind: "wind",
    gust: "wind",
    satellite: "satellite",
    pressure: "clouds",
    waves: "wind",
  };
  return map[key] ?? key;
}

export function pickWindyTileUrl(
  layers: WindyTileLayer[],
  overlay: string,
): string | null {
  const want = overlayToLayerId(overlay);
  const hit = layers.find((l) => l.id === want && isWindyTileUrl(l.urlTemplate));
  if (hit) return hit.urlTemplate;
  const rain = layers.find((l) => l.id === "rain-radar" && isWindyTileUrl(l.urlTemplate));
  if (rain) return rain.urlTemplate;
  const any = layers.find((l) => isWindyTileUrl(l.urlTemplate));
  return any?.urlTemplate ?? null;
}

/** Public catalog — no JWT; works for all dashboards when WINDY_API_KEY is on Render. */
export async function fetchPublicWindyTileLayers(): Promise<WindyLayersResponse> {
  const url = `${getApiBaseUrl().replace(/\/$/, "")}/weather/tiles/layers`;
  try {
    const res = await fetchWithTimeout(url, { method: "GET", cache: "no-store" }, 25_000);
    if (!res.ok) {
      return { configured: false, provider: "none", layers: [] };
    }
    const data = (await res.json()) as WindyLayersResponse;
    const layers = (data.layers ?? []).filter((l) => isWindyTileUrl(l.urlTemplate));
    return {
      configured: Boolean(data.configured && layers.length > 0),
      provider: data.configured ? "windy" : "none",
      layers,
    };
  } catch {
    return { configured: false, provider: "none", layers: [] };
  }
}

/** Prefer public proxy layers; optional JWT bundle as fallback. */
export async function fetchWindyTileLayers(
  accessToken?: string | null,
): Promise<WindyLayersResponse> {
  const pub = await fetchPublicWindyTileLayers();
  if (pub.configured && pub.layers.length > 0) {
    return pub;
  }
  const token = accessToken?.trim();
  if (!token) {
    return pub;
  }
  try {
    const wx = await fetchEocWeather(token);
    const layers = (wx.openWeather.layers ?? []).filter((l) => isWindyTileUrl(l.urlTemplate));
    if (layers.length > 0) {
      return {
        configured: true,
        provider: wx.openWeather.provider ?? "windy",
        layers,
      };
    }
  } catch {
    /* ignore */
  }
  return pub;
}
