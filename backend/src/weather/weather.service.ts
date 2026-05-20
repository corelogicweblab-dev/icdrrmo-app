import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import { ISABELA_HAZARD_DISCLAIMER, ISABELA_HAZARD_ZONES } from './isabela-hazard-reference';
import { PagasaRssService, type PagasaAdvisoryItem } from './pagasa-rss.service';

export type OpenWeatherLayerConfig = {
  id: string;
  label: string;
  urlTemplate: string;
};

export type EocWeatherBundle = {
  situation: WeatherSituationSnapshot;
  pagasa: {
    source: string;
    fetchedAt: string;
    items: PagasaAdvisoryItem[];
    upstreamError?: string;
  };
  openWeather: {
    configured: boolean;
    layers: OpenWeatherLayerConfig[];
  };
  /** Client can use RainViewer without API key */
  rainViewer: { available: boolean };
};

/** CDRRMO reference point — Isabela City proper (WGS84). */
const ISABELA_LAT = 6.70325;
const ISABELA_LON = 121.98235;

/** Open-Meteo asks for a descriptive User-Agent for fair-use routing. */
const OPEN_METEO_UA =
  'ICDRRMO-IsabelaCity-Basilan/1.0 (+https://github.com/corelogicweblab-dev/icdrrmo-app; ops-weather)';

const OPEN_METEO_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${ISABELA_LAT}&longitude=${ISABELA_LON}` +
  '&current=temperature_2m,relative_humidity_2m,weather_code,is_day,precipitation,rain' +
  '&hourly=precipitation_probability,precipitation,rain,weathercode' +
  '&timezone=Asia%2FManila&forecast_days=2';

/** Cross-process / cross-replica cache (requires `REDIS_URL` on the API). */
const REDIS_SITUATION_KEY = 'icd:v1:weather:situation';

type OpenMeteoHourly = {
  time?: string[];
  precipitation_probability?: (number | null)[];
  precipitation?: (number | null)[];
  rain?: (number | null)[];
  weathercode?: (number | null)[];
};

type OpenMeteoCurrent = {
  temperature_2m?: number;
  relative_humidity_2m?: number;
  weather_code?: number;
  precipitation?: number;
  rain?: number;
  is_day?: number;
};

type OpenMeteoResponse = {
  current?: OpenMeteoCurrent;
  hourly?: OpenMeteoHourly;
};

export type WeatherSituationSnapshot = {
  location: { label: string; latitude: number; longitude: number };
  fetchedAt: string;
  source: string;
  hazardDisclaimer: string;
  hazardZones: typeof ISABELA_HAZARD_ZONES;
  current: {
    temperatureC: number | null;
    humidityPct: number | null;
    weatherCode: number | null;
    weatherLabel: string;
    precipitationMm: number | null;
    rainMm: number | null;
    isDay: boolean | null;
  };
  nextHours: Array<{
    time: string;
    precipProbPct: number | null;
    precipMm: number | null;
    rainMm: number | null;
    weatherCode: number | null;
  }>;
  rainOutlook6h: {
    willRainLikely: boolean;
    headline: string;
    maxPrecipProbPct: number;
    totalRainMm: number;
    maxHourlyRainMm: number;
  };
  upstreamError?: string;
};

function wmoLabel(code: number | undefined): string {
  if (code == null) return 'Unknown';
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Mainly clear / partly cloudy';
  if (code <= 48) return 'Fog / depositing rime fog';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow / snow grains';
  if (code <= 82) return 'Rain showers';
  if (code <= 86) return 'Snow showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Other';
}

function isRainyCode(code: number | undefined): boolean {
  if (code == null) return false;
  return (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    (code >= 95 && code <= 99) ||
    code === 45 ||
    code === 48
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

@Injectable()
export class WeatherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WeatherService.name);

  constructor(private readonly pagasa: PagasaRssService) {}

  private redis: Redis | null = null;
  /** Last successful JSON parse (no upstreamError). */
  private goodSnapshot: WeatherSituationSnapshot | null = null;
  private goodSnapshotWallMs = 0;
  private inflight: Promise<WeatherSituationSnapshot> | null = null;

  onModuleInit(): void {
    const url = process.env.REDIS_URL?.trim();
    if (!url || process.env.NODE_ENV === 'test') {
      this.logger.log('Weather shared cache: in-memory only (set REDIS_URL for cross-replica Open-Meteo cache).');
      return;
    }
    try {
      this.redis = new Redis(url, {
        maxRetriesPerRequest: 2,
        enableReadyCheck: true,
      });
      this.redis.on('error', (e: Error) => this.logger.warn(`Weather Redis: ${e.message}`));
      this.logger.log('Weather shared cache: Redis enabled for Open-Meteo snapshot.');
    } catch (e) {
      this.logger.warn(`Weather Redis init failed: ${e instanceof Error ? e.message : e}`);
      this.redis = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit().catch(() => {});
      this.redis = null;
    }
  }

  private cacheTtlMs(): number {
    const sec = Number(process.env.OPEN_METEO_CACHE_TTL_SEC);
    if (Number.isFinite(sec) && sec >= 60) return Math.floor(sec * 1000);
    return 900_000;
  }

  private redisTtlSec(): number {
    const sec = Number(process.env.OPEN_METEO_REDIS_TTL_SEC);
    if (Number.isFinite(sec) && sec >= 300) return Math.floor(sec);
    return 2700;
  }

  private async readSharedCache(): Promise<WeatherSituationSnapshot | null> {
    if (!this.redis) return null;
    try {
      const raw = await this.redis.get(REDIS_SITUATION_KEY);
      if (!raw) return null;
      const o = JSON.parse(raw) as WeatherSituationSnapshot;
      if (o?.location?.latitude == null || o?.rainOutlook6h == null) return null;
      let source = o.source ?? 'Open-Meteo';
      if (!source.includes('shared server cache')) {
        source = `${source} · shared server cache`;
      }
      return { ...o, upstreamError: undefined, source };
    } catch {
      return null;
    }
  }

  private async writeSharedCache(s: WeatherSituationSnapshot): Promise<void> {
    if (!this.redis) return;
    const ttl = this.redisTtlSec();
    try {
      await this.redis.setex(REDIS_SITUATION_KEY, ttl, JSON.stringify(s));
    } catch (e) {
      this.logger.warn(`Weather Redis SETEX failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  async getSituationSnapshot(): Promise<WeatherSituationSnapshot> {
    const ttl = this.cacheTtlMs();
    const now = Date.now();
    if (this.goodSnapshot && now - this.goodSnapshotWallMs < ttl) {
      return this.goodSnapshot;
    }

    const shared = await this.readSharedCache();
    if (shared) {
      this.goodSnapshot = shared;
      this.goodSnapshotWallMs = now;
      return shared;
    }

    if (this.inflight) {
      return this.inflight;
    }
    this.inflight = (async () => {
      try {
        return await this.refreshFromUpstream();
      } catch (e: unknown) {
        return this.buildErrorSnapshot(e);
      }
    })();
    try {
      return await this.inflight;
    } finally {
      this.inflight = null;
    }
  }

  private buildErrorSnapshot(e: unknown): WeatherSituationSnapshot {
    const msg = e instanceof Error ? e.message : String(e);
    this.logger.warn(`Open-Meteo refresh failed: ${msg}`);
    if (this.goodSnapshot) {
      return {
        ...this.goodSnapshot,
        upstreamError: undefined,
        source:
          'Open-Meteo (showing last good forecast — live refresh failed; will retry on next cache expiry)',
      };
    }
    return this.emptySnapshot(msg);
  }

  private emptySnapshot(upstreamError: string): WeatherSituationSnapshot {
    return {
      location: {
        label: 'Isabela City, Basilan (EOC reference grid)',
        latitude: ISABELA_LAT,
        longitude: ISABELA_LON,
      },
      fetchedAt: new Date().toISOString(),
      source: 'Open-Meteo (hourly forecast, no API key)',
      hazardDisclaimer: ISABELA_HAZARD_DISCLAIMER,
      hazardZones: ISABELA_HAZARD_ZONES,
      current: {
        temperatureC: null,
        humidityPct: null,
        weatherCode: null,
        weatherLabel: 'Unavailable',
        precipitationMm: null,
        rainMm: null,
        isDay: null,
      },
      nextHours: [],
      rainOutlook6h: {
        willRainLikely: false,
        headline: 'Forecast unavailable — check connection or try again.',
        maxPrecipProbPct: 0,
        totalRainMm: 0,
        maxHourlyRainMm: 0,
      },
      upstreamError,
    };
  }

  private friendlyUpstreamError(status: number): string {
    if (status === 429) {
      return (
        'The free weather model is temporarily busy (too many requests). ' +
        'Wait a few minutes and refresh. If this persists, set REDIS_URL on the API so all servers share one forecast cache.'
      );
    }
    return `Open-Meteo HTTP ${status}`;
  }

  private async refreshFromUpstream(): Promise<WeatherSituationSnapshot> {
    const res = await this.fetchOpenMeteoWithRetry();
    if (!res.ok) {
      const err = this.friendlyUpstreamError(res.status);
      this.logger.warn(`Open-Meteo HTTP ${res.status}`);
      if (this.goodSnapshot) {
        return {
          ...this.goodSnapshot,
          upstreamError: undefined,
          source:
            res.status === 429
              ? 'Open-Meteo (cached forecast — upstream rate limit; cache reduces repeat calls)'
              : 'Open-Meteo (cached forecast — upstream error)',
        };
      }
      const again = await this.readSharedCache();
      if (again) {
        this.goodSnapshot = again;
        this.goodSnapshotWallMs = Date.now();
        return again;
      }
      return this.emptySnapshot(err);
    }

    let json: OpenMeteoResponse;
    try {
      json = (await res.json()) as OpenMeteoResponse;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Open-Meteo JSON parse failed: ${msg}`);
      if (this.goodSnapshot) {
        return {
          ...this.goodSnapshot,
          upstreamError: undefined,
          source: 'Open-Meteo (cached forecast — invalid upstream response)',
        };
      }
      const again = await this.readSharedCache();
      if (again) {
        this.goodSnapshot = again;
        this.goodSnapshotWallMs = Date.now();
        return again;
      }
      return this.emptySnapshot(`Invalid JSON: ${msg}`);
    }
    const snapshot = this.parseOpenMeteoJson(json);
    this.goodSnapshot = snapshot;
    this.goodSnapshotWallMs = Date.now();
    void this.writeSharedCache(snapshot);
    return snapshot;
  }

  private async fetchOpenMeteoWithRetry(): Promise<Response> {
    const maxAttempts = 4;
    let delayMs = 2000;
    let last: Response | null = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      last = await fetch(OPEN_METEO_URL, {
        headers: { 'User-Agent': OPEN_METEO_UA, Accept: 'application/json' },
      });
      if (last.ok) return last;
      if (last.status !== 429) return last;

      const ra = last.headers.get('retry-after');
      let wait = delayMs + Math.floor(Math.random() * 800);
      if (ra) {
        const sec = Number.parseInt(ra, 10);
        if (Number.isFinite(sec) && sec > 0) {
          wait = Math.min(120_000, sec * 1000);
        }
      }
      this.logger.warn(`Open-Meteo 429 — attempt ${attempt}/${maxAttempts}, waiting ${wait}ms`);
      await sleep(wait);
      delayMs = Math.min(delayMs * 2, 25_000);
    }
    return last ?? new Response('', { status: 599 });
  }

  private parseOpenMeteoJson(json: OpenMeteoResponse): WeatherSituationSnapshot {
    const hazardZones = ISABELA_HAZARD_ZONES;
    const base: WeatherSituationSnapshot = {
      location: {
        label: 'Isabela City, Basilan (EOC reference grid)',
        latitude: ISABELA_LAT,
        longitude: ISABELA_LON,
      },
      fetchedAt: new Date().toISOString(),
      source: 'Open-Meteo (hourly forecast, no API key)',
      hazardDisclaimer: ISABELA_HAZARD_DISCLAIMER,
      hazardZones,
      current: {
        temperatureC: null,
        humidityPct: null,
        weatherCode: null,
        weatherLabel: 'Unavailable',
        precipitationMm: null,
        rainMm: null,
        isDay: null,
      },
      nextHours: [],
      rainOutlook6h: {
        willRainLikely: false,
        headline: 'Forecast unavailable — check connection or try again.',
        maxPrecipProbPct: 0,
        totalRainMm: 0,
        maxHourlyRainMm: 0,
      },
    };

    const cur = json.current;
    const hourly = json.hourly;
    const times = hourly?.time ?? [];
    const probs = hourly?.precipitation_probability ?? [];
    const precips = hourly?.precipitation ?? [];
    const rains = hourly?.rain ?? [];
    const codes = hourly?.weathercode ?? [];

    const now = Date.now();
    let startIdx = 0;
    for (let i = 0; i < times.length; i++) {
      const t0 = times[i];
      if (!t0) continue;
      if (new Date(t0).getTime() >= now - 30 * 60 * 1000) {
        startIdx = i;
        break;
      }
    }
    const slice: WeatherSituationSnapshot['nextHours'] = [];
    for (let i = startIdx; i < Math.min(startIdx + 6, times.length); i++) {
      const t = times[i];
      if (!t) continue;
      slice.push({
        time: t,
        precipProbPct: probs[i] ?? null,
        precipMm: precips[i] ?? null,
        rainMm: rains[i] ?? null,
        weatherCode: codes[i] ?? null,
      });
    }

    let maxProb = 0;
    let totalRain = 0;
    let maxHourRain = 0;
    for (const h of slice) {
      maxProb = Math.max(maxProb, h.precipProbPct ?? 0);
      totalRain += h.rainMm ?? h.precipMm ?? 0;
      maxHourRain = Math.max(maxHourRain, h.rainMm ?? h.precipMm ?? 0);
    }
    const curCode = cur?.weather_code;
    const curRainy = isRainyCode(curCode);
    const willRainLikely = curRainy || maxProb >= 45 || totalRain >= 1.5 || maxHourRain >= 0.8;

    let headline: string;
    if (curRainy) {
      headline = `Now: ${wmoLabel(curCode)} — rain or strong showers in the area.`;
    } else if (willRainLikely) {
      headline = `Next ~6h: rain likely (max ${Math.round(maxProb)}% hourly chance, ~${totalRain.toFixed(1)} mm model rain).`;
    } else {
      headline = `Next ~6h: rain unlikely (max ${Math.round(maxProb)}% chance; model total ~${totalRain.toFixed(1)} mm).`;
    }

    return {
      ...base,
      current: {
        temperatureC: cur?.temperature_2m ?? null,
        humidityPct: cur?.relative_humidity_2m ?? null,
        weatherCode: curCode ?? null,
        weatherLabel: wmoLabel(curCode),
        precipitationMm: cur?.precipitation ?? null,
        rainMm: cur?.rain ?? null,
        isDay: cur?.is_day === 1 ? true : cur?.is_day === 0 ? false : null,
      },
      nextHours: slice,
      rainOutlook6h: {
        willRainLikely,
        headline,
        maxPrecipProbPct: Math.round(maxProb),
        totalRainMm: Math.round(totalRain * 10) / 10,
        maxHourlyRainMm: Math.round(maxHourRain * 10) / 10,
      },
    };
  }

  getOpenWeatherLayers(): { configured: boolean; layers: OpenWeatherLayerConfig[] } {
    const key = process.env.OPENWEATHERMAP_API_KEY?.trim();
    if (!key) {
      return { configured: false, layers: [] };
    }
    const base = 'https://tile.openweathermap.org/map';
    const tpl = (layer: string) =>
      `${base}/${layer}/{z}/{x}/{y}.png?appid=${encodeURIComponent(key)}`;
    return {
      configured: true,
      layers: [
        { id: 'precipitation', label: 'Rain / precipitation', urlTemplate: tpl('precipitation_new') },
        { id: 'clouds', label: 'Clouds', urlTemplate: tpl('clouds_new') },
        { id: 'temp', label: 'Temperature', urlTemplate: tpl('temp_new') },
        { id: 'wind', label: 'Wind', urlTemplate: tpl('wind_new') },
      ],
    };
  }

  async getEocWeatherBundle(): Promise<EocWeatherBundle> {
    const [situation, pagasa] = await Promise.all([
      this.getSituationSnapshot(),
      this.pagasa.fetchAdvisories(),
    ]);
    return {
      situation,
      pagasa,
      openWeather: this.getOpenWeatherLayers(),
      rainViewer: { available: true },
    };
  }
}
