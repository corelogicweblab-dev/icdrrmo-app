import { fetchEocWeather } from "@/lib/eoc-weather";

/** Shown on Leaflet — never "Windy" branding. */
export const ICDRRMO_WEATHER_ATTRIBUTION = "ICDRRMO · Live weather layers";

export type WindyTileLayer = { id: string; label: string; urlTemplate: string };

/** Dark basemap pairs well with Windy-style weather overlays (no third-party logo). */
export const WINDY_STYLE_BASEMAP_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

export const WINDY_STYLE_BASEMAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

export function isWindyTileUrl(url: string): boolean {
  return url.includes("tiles.windy.com");
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

export async function fetchWindyTileLayers(
  accessToken: string,
): Promise<{ provider: string; layers: WindyTileLayer[] }> {
  const wx = await fetchEocWeather(accessToken);
  const layers = (wx.openWeather.layers ?? []).filter((l) =>
    isWindyTileUrl(l.urlTemplate),
  );
  return {
    provider: wx.openWeather.provider ?? "none",
    layers,
  };
}
