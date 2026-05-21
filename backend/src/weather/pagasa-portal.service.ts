import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import type { HazardGeoJsonFeature, HazardGeoJsonFeatureCollection } from './geojson.types';
import { offsetPoint, PH_CENTER } from './geojson-parse.util';
import { parsePagasaHtmlAdvisories } from './pagasa-html.util';

const DEFAULT_PORTAL_URL = 'https://www.pagasa.dost.gov.ph/weather/weather-advisory';
const EXTRA_PORTAL_URLS = [
  'https://www.pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin',
  'https://www.pagasa.dost.gov.ph/',
];
const REDIS_KEY = 'icd:v1:weather:pagasa:portal:geojson';

export type PagasaPortalAdvisory = {
  id: string;
  title: string;
  link: string;
  excerpt: string;
  publishedHint: string;
};

export type PagasaPortalFetchResult = {
  source: string;
  fetchedAt: string;
  advisories: PagasaPortalAdvisory[];
  collection: HazardGeoJsonFeatureCollection;
  upstreamError?: string;
};

@Injectable()
export class PagasaPortalService {
  private readonly logger = new Logger(PagasaPortalService.name);
  private redis: Redis | null = null;

  constructor() {
    const url = process.env.REDIS_URL?.trim();
    if (url && process.env.NODE_ENV !== 'test') {
      try {
        this.redis = new Redis(url, { maxRetriesPerRequest: 2 });
      } catch {
        this.redis = null;
      }
    }
  }

  private portalUrl(): string {
    return process.env.PAGASA_PORTAL_URL?.trim() || DEFAULT_PORTAL_URL;
  }

  private cacheTtlSec(): number {
    const sec = Number(process.env.PAGASA_PORTAL_CACHE_TTL_SEC);
    return Number.isFinite(sec) && sec >= 300 ? Math.floor(sec) : 1800;
  }

  private absoluteLink(href: string, base: string): string {
    const h = href.trim();
    if (!h || h.startsWith('#')) return '';
    if (h.startsWith('http://') || h.startsWith('https://')) return h;
    try {
      return new URL(h, base).href;
    } catch {
      return h;
    }
  }

  parsePortalHtml(html: string, baseUrl: string): PagasaPortalAdvisory[] {
    return parsePagasaHtmlAdvisories(html, baseUrl).map((a) => ({
      ...a,
      publishedHint: '',
    }));
  }

  advisoriesToGeoJson(advisories: PagasaPortalAdvisory[]): HazardGeoJsonFeature[] {
    return advisories.map((a, i) => ({
      type: 'Feature' as const,
      id: `pagasa:${a.id.slice(0, 120)}`,
      geometry: {
        type: 'Point' as const,
        coordinates: offsetPoint(PH_CENTER, i),
      },
      properties: {
        source: 'pagasa',
        kind: 'official-advisory',
        title: a.title,
        link: a.link,
        excerpt: a.excerpt,
        publishedHint: a.publishedHint,
        portalUrl: this.portalUrl(),
      },
    }));
  }

  async fetchGeoJson(): Promise<PagasaPortalFetchResult> {
    if (this.redis) {
      try {
        const cached = await this.redis.get(REDIS_KEY);
        if (cached) {
          return JSON.parse(cached) as PagasaPortalFetchResult;
        }
      } catch {
        /* ignore */
      }
    }

    const base = this.portalUrl();
    const empty: HazardGeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [],
      properties: { source: 'pagasa-portal', portalUrl: base },
    };

    try {
      const urls = [base, ...EXTRA_PORTAL_URLS.filter((u) => u !== base)];
      const seen = new Set<string>();
      const advisories: PagasaPortalAdvisory[] = [];
      for (const url of urls) {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ICDRRMO-EOC/1.0; +pagasa-portal)',
            Accept: 'text/html,application/xhtml+xml',
          },
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) continue;
        const html = await res.text();
        for (const a of this.parsePortalHtml(html, url)) {
          if (seen.has(a.id)) continue;
          seen.add(a.id);
          advisories.push(a);
        }
        if (advisories.length >= 20) break;
      }
      if (!advisories.length) {
        throw new Error('PAGASA portal scrape returned no advisories');
      }
      const features = this.advisoriesToGeoJson(advisories);
      const payload: PagasaPortalFetchResult = {
        source: 'PAGASA Portal',
        fetchedAt: new Date().toISOString(),
        advisories,
        collection: {
          type: 'FeatureCollection',
          features,
          properties: {
            source: 'pagasa-portal',
            portalUrl: base,
            itemCount: features.length,
          },
        },
      };
      if (this.redis) {
        await this.redis.setex(REDIS_KEY, this.cacheTtlSec(), JSON.stringify(payload));
      }
      return payload;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`PAGASA portal scrape failed: ${msg}`);
      return {
        source: 'PAGASA Portal',
        fetchedAt: new Date().toISOString(),
        advisories: [],
        collection: empty,
        upstreamError: msg,
      };
    }
  }
}
