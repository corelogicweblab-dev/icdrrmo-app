export {
  fetchRainViewerTileUrl,
  RAINVIEWER_MAX_NATIVE_ZOOM,
} from "@/lib/eoc-public-feeds";

export function mapboxDarkTileUrl(token: string): string {
  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${encodeURIComponent(token)}`;
}

export const EOC_MAP_BUILD = "2026.05.21-windy-proxy-no-logo";
