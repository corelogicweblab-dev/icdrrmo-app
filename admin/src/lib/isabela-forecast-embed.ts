/** Isabela City grid point — matches `backend/src/weather/weather.service.ts` forecast pin. */
export const ISABELA_CITY_LAT = 6.70325;
export const ISABELA_CITY_LON = 121.98235;

/** Wider Philippines / Sulu Sea context for the full-screen desk map. */
export const PH_SYNOPTIC_LAT = 12.25;
export const PH_SYNOPTIC_LON = 122.25;
export const PH_SYNOPTIC_ZOOM = 6;

export type ForecastDeskEmbedMode = "map" | "forecast";

/**
 * Hosted forecast desk embed URL (industry-standard desk viewer — keep UI white-label).
 * `type=forecast` shows the meteogram-style panel when `mode` is `forecast`.
 */
export function isabelaForecastDeskEmbedUrl(opts: {
  lat: number;
  lon: number;
  zoom: number;
  overlay: string;
  mode: ForecastDeskEmbedMode;
  /** When true, pins the detail point (meteogram / picker). */
  withDetail: boolean;
}): string {
  const { lat, lon, zoom, overlay, mode, withDetail } = opts;
  const q = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    ...(withDetail
      ? {
          detailLat: String(lat),
          detailLon: String(lon),
        }
      : {}),
    zoom: String(zoom),
    level: "surface",
    overlay,
    menu: "",
    message: "",
    marker: withDetail ? "true" : "",
    calendar: "now",
    pressure: "",
    type: mode === "forecast" ? "forecast" : "map",
    location: "coordinates",
    detail: mode === "forecast" && withDetail ? "true" : "",
    metricWind: "kmh",
    metricTemp: "default",
    radarRange: "-1",
    product: "ecmwf",
  });
  return `https://embed.windy.com/embed2.html?${q.toString()}`;
}
