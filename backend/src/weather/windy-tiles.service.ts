import { Injectable, NotFoundException } from '@nestjs/common';
import type { OpenWeatherLayerConfig } from './weather.service';

/** Windy raster layers — v9.0 tile API (https://tiles.windy.com/tiles/v9.0/{layer}/…) */
const WINDY_RASTER_LAYERS: Array<{ id: string; windy: string; label: string }> = [
  { id: 'rain-radar', windy: 'rain', label: 'Rain radar (live)' },
  { id: 'precipitation', windy: 'rain', label: 'Rain / precipitation' },
  { id: 'clouds', windy: 'clouds', label: 'Clouds' },
  { id: 'temp', windy: 'temp', label: 'Temperature' },
  { id: 'wind', windy: 'wind', label: 'Wind' },
  { id: 'satellite', windy: 'satellite', label: 'Satellite' },
];

const PROXY_LAYER_IDS = new Set(WINDY_RASTER_LAYERS.map((l) => l.windy));

/** Render / local may use alternate env names — normalize here. */
export function resolveWindyApiKey(): string | undefined {
  const key =
    process.env.WINDY_API_KEY?.trim() ||
    process.env.WINDY_KEY?.trim() ||
    process.env.WINDY_API?.trim();
  return key || undefined;
}

@Injectable()
export class WindyTilesService {
  /** Public API base for browser tile requests (ICDRRMO proxy — no Windy logo iframe). */
  getPublicApiBase(): string {
    const raw =
      process.env.API_PUBLIC_BASE_URL?.trim() ||
      process.env.RENDER_EXTERNAL_URL?.trim() ||
      'https://icdrrmo-backend-q04d.onrender.com';
    const base = raw.replace(/\/$/, '');
    return base.endsWith('/api/v1') ? base : `${base}/api/v1`;
  }

  getLayers(): { configured: boolean; layers: OpenWeatherLayerConfig[] } {
    return this.getPublicLayers();
  }

  getPublicLayers(): {
    configured: boolean;
    provider: 'windy' | 'none';
    layers: OpenWeatherLayerConfig[];
  } {
    const key = resolveWindyApiKey();
    if (!key) {
      return { configured: false, provider: 'none', layers: [] };
    }
    const apiBase = this.getPublicApiBase();
    const layers = WINDY_RASTER_LAYERS.map((l) => ({
      id: l.id,
      label: l.label,
      urlTemplate: `${apiBase}/weather/tiles/${l.windy}/{z}/{x}/{y}.png`,
    }));
    return { configured: layers.length > 0, provider: 'windy', layers };
  }

  /** Probe upstream Windy v9.0 tile — Map Forecast keys often return transparent PNGs. */
  async probeUpstreamTile(layer = 'rain'): Promise<boolean> {
    const key = resolveWindyApiKey();
    if (!key || !this.isAllowedProxyLayer(layer)) return false;
    try {
      const url = this.upstreamTileUrl(layer, '6', '53', '30');
      const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
      if (!res.ok) return false;
      const buf = Buffer.from(await res.arrayBuffer());
      return buf.byteLength > 600;
    } catch {
      return false;
    }
  }

  isAllowedProxyLayer(layer: string): boolean {
    return PROXY_LAYER_IDS.has(layer);
  }

  upstreamTileUrl(layer: string, z: string, x: string, y: string): string {
    const key = resolveWindyApiKey();
    if (!key || !this.isAllowedProxyLayer(layer)) {
      throw new NotFoundException('Weather tile not available');
    }
    const enc = encodeURIComponent(key);
    return `https://tiles.windy.com/tiles/v9.0/${layer}/${z}/${x}/${y}.png?key=${enc}`;
  }
}
