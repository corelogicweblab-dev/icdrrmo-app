import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import type { HazardGeoJsonFeature, HazardGeoJsonFeatureCollection } from './geojson.types';
import { offsetPoint, PH_CENTER, stripXmlTags } from './geojson-parse.util';

const DEFAULT_PORTAL_URL = 'https://www.pagasa.dost.gov.ph/';
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

  /** Lightweight HTML scrape — no headless browser; respects public portal markup. */
  parsePortalHtml(html: string, baseUrl: string): PagasaPortalAdvisory[] {
    const advisories: PagasaPortalAdvisory[] = [];
    const seen = new Set<string>();

    const linkRe =
      /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    const keywords =
      /weather|advisory|bulletin|tropical|cyclone|typhoon|rainfall|flood|warning|signal|bagyo|bagyo/i;

    while ((m = linkRe.exec(html)) !== null) {
      const href = m[1];
      const text = stripXmlTags(m[2]);
      if (!text || text.length < 12 || text.length > 220) continue;
      if (!keywords.test(`${href} ${text}`)) continue;
      const link = this.absoluteLink(href, baseUrl);
      if (!link || seen.has(link)) continue;
      seen.add(link);
      advisories.push({
        id: link,
        title: text,
        link,
        excerpt: text,
        publishedHint: '',
      });
      if (advisories.length >= 30) break;
    }

    const headingRe =
      /<h[23][^>]*>([\s\S]*?)<\/h[23]>\s*(?:<p[^>]*>([\s\S]*?)<\/p>)?/gi;
    while ((m = headingRe.exec(html)) !== null) {
      const title = stripXmlTags(m[1]);
      const body = stripXmlTags(m[2] ?? '');
      if (!title || title.length < 10 || !keywords.test(title)) continue;
      const id = `heading:${title.slice(0, 60)}`;
      if (seen.has(id)) continue;
      seen.add(id);
      advisories.push({
        id,
        title,
        link: baseUrl,
        excerpt: (body || title).slice(0, 800),
        publishedHint: '',
      });
      if (advisories.length >= 35) break;
    }

    return advisories.slice(0, 25);
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
      const res = await fetch(base, {
        headers: {
          'User-Agent': 'ICDRRMO-EOC/1.0 (+pagasa-portal-scraper)',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        throw new Error(`PAGASA portal HTTP ${res.status}`);
      }
      const html = await res.text();
      const advisories = this.parsePortalHtml(html, base);
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
