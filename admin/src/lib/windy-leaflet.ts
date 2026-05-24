import { fetchWithTimeout } from "@/lib/api-fetch";
import { getApiBaseUrl } from "@/lib/env";
import { fetchEocWeather } from "@/lib/eoc-weather";
import { fetchRainViewerTileLayers } from "@/lib/eoc-public-feeds";

export const ICDRRMO_WEATHER_ATTRIBUTION = "ICDRRMO · Weather intelligence";

export type WindyTileLayer = { id: string; label: string; urlTemplate: string };

export type WindyLayersResponse = {
  configured: boolean;
  provider: string;
  layers: WindyTileLayer[];
};

/** Terrain + roads (labels rendered in a separate layer on top of weather). */
export const WINDY_STYLE_BASEMAP_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png";

/** City / barangay / road labels — always above weather radar overlays. */
export const WINDY_STYLE_LABELS_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png";

export const WINDY_STYLE_BASEMAP_ATTRIBUTION = "ICDRRMO · Weather intelligence";

/** ICDRRMO API proxy or Windy v9.0 raster host. */
export function isWindyTileUrl(url: string): boolean {
  return url.includes("/weather/tiles/") || url.includes("tiles.windy.com");
}

export function isRainViewerTileUrl(url: string): boolean {
  return url.includes("rainviewer.com");
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
  const hit = layers.find((l) => l.id === want && l.urlTemplate);
  if (hit) return hit.urlTemplate;
  const rain = layers.find((l) => l.id === "rain-radar" && l.urlTemplate);
  if (rain) return rain.urlTemplate;
  const any = layers.find((l) => l.urlTemplate);
  return any?.urlTemplate ?? null;
}

function windyResponse(layers: WindyTileLayer[], provider: string): WindyLayersResponse {
  return {
    configured: layers.length > 0,
    provider,
    layers,
  };
}

/** Sample tile near Isabela / Mindanao — reject 404 or empty Windy transparent PNGs. */
export async function probeWeatherTileUrl(urlTemplate: string): Promise<boolean> {
  const sample = urlTemplate
    .replace("{z}", "6")
    .replace("{x}", "53")
    .replace("{y}", "30");
  try {
    const res = await fetchWithTimeout(sample, { method: "GET", cache: "no-store" }, 15_000);
    if (!res.ok) return false;
    const buf = await res.arrayBuffer();
    return buf.byteLength > 600;
  } catch {
    return false;
  }
}

async function resolveWorkingLayers(
  layers: WindyTileLayer[],
  provider: string,
): Promise<WindyLayersResponse | null> {
  if (!layers.length) return null;
  const probe = layers.find((l) => l.urlTemplate)?.urlTemplate;
  if (!probe) return null;
  if (await probeWeatherTileUrl(probe)) {
    return windyResponse(layers, provider);
  }
  return null;
}

/** Public tile catalog — validated proxy → RainViewer. Skips broken Windy raster (404 / transparent). */
export async function fetchPublicWindyTileLayers(): Promise<WindyLayersResponse> {
  const url = `${getApiBaseUrl().replace(/\/$/, "")}/weather/tiles/layers`;
  try {
    const res = await fetchWithTimeout(url, { method: "GET", cache: "no-store" }, 25_000);
    if (res.ok) {
      const data = (await res.json()) as WindyLayersResponse;
      const layers = data.layers ?? [];
      if (layers.length > 0 && data.provider === "windy") {
        const working = await resolveWorkingLayers(layers, "windy");
        if (working) return working;
      }
      if (layers.length > 0 && data.provider === "rainviewer") {
        return windyResponse(layers, "rainviewer");
      }
    }
  } catch {
    /* fall through */
  }

  const rainviewer = await fetchRainViewerTileLayers();
  return windyResponse(rainviewer, rainviewer.length > 0 ? "rainviewer" : "none");
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
    const layers = wx.openWeather.layers ?? [];
    if (layers.length > 0) {
      const working = await resolveWorkingLayers(layers, wx.openWeather.provider ?? "icdrrmo");
      if (working) return working;
    }
  } catch {
    /* ignore */
  }
  return pub;
}
