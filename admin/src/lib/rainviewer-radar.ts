/** RainViewer radar manifest + animated tile URLs (no API key). */

export type RainViewerFrame = {
  time: number;
  path: string;
};

export type RainViewerManifest = {
  radarFrames: RainViewerFrame[];
  satelliteFrames: RainViewerFrame[];
  generatedAt: number;
};

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/v2/radar/${path}`;
}

export function rainRadarTileTemplate(path: string): string {
  return `https://tilecache.rainviewer.com${normalizePath(path)}/256/{z}/{x}/{y}/2/1_1.png`;
}

export function rainCloudTileTemplate(path: string): string {
  return `https://tilecache.rainviewer.com${normalizePath(path)}/256/{z}/{x}/{y}/2/1_0.png`;
}

export function satelliteTileTemplate(path: string): string {
  const p = path.startsWith("/") ? path : `/v2/satellite/${path}`;
  return `https://tilecache.rainviewer.com${p}/256/{z}/{x}/{y}/0/0_0.png`;
}

export function formatRadarFrameTime(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export async function fetchRainViewerManifest(): Promise<RainViewerManifest | null> {
  try {
    const res = await fetch("https://api.rainviewer.com/public/weather-maps.json", {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      generated?: number;
      radar?: {
        past?: RainViewerFrame[];
        nowcast?: RainViewerFrame[];
      };
      satellite?: { infrared?: { past?: RainViewerFrame[] } };
    };
    const past = data.radar?.past ?? [];
    const nowcast = data.radar?.nowcast ?? [];
    const radarFrames = [...past, ...nowcast].filter((f) => f.path);
    const satelliteFrames = (data.satellite?.infrared?.past ?? []).filter((f) => f.path);
    if (!radarFrames.length && !satelliteFrames.length) return null;
    return {
      radarFrames,
      satelliteFrames,
      generatedAt: data.generated ?? Math.floor(Date.now() / 1000),
    };
  } catch {
    return null;
  }
}
