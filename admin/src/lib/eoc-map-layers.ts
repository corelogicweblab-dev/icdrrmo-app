/** Free radar tiles (no API key) — same source as Isabela weather desk. */
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

export function mapboxDarkTileUrl(token: string): string {
  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${encodeURIComponent(token)}`;
}

export const EOC_MAP_BUILD = "2026.05.20-eoc-v7-radarfix";
