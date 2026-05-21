import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import type { HazardGeoJsonFeature, HazardGeoJsonFeatureCollection } from './geojson.types';
import {
  alertLevelFromTitle,
  namespacedTag,
  parseGdacsBbox,
  parseGeorssPoint,
  parseGeorssPolygon,
  stripXmlTags,
  tagValue,
} from './geojson-parse.util';

/** Main feed often times out; 24h feed is reliable and includes geo:Point. */
const DEFAULT_FEED = 'https://www.gdacs.org/xml/rss_24h.xml';
const REDIS_KEY = 'icd:v1:weather:gdacs:geojson';

export type GdacsFetchResult = {
  source: string;
  fetchedAt: string;
  collection: HazardGeoJsonFeatureCollection;
  upstreamError?: string;
};

@Injectable()
export class GdacsGeorssService {
  private readonly logger = new Logger(GdacsGeorssService.name);
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

  private feedUrl(): string {
    return process.env.GDACS_GEORSS_URL?.trim() || DEFAULT_FEED;
  }

  private cacheTtlSec(): number {
    const sec = Number(process.env.GDACS_CACHE_TTL_SEC);
    return Number.isFinite(sec) && sec >= 300 ? Math.floor(sec) : 900;
  }

  private parseItem(block: string, index: number): HazardGeoJsonFeature | null {
    const title = tagValue(block, 'title') || namespacedTag(block, 'title');
    if (!title) return null;

    const link = (block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? '').trim();
    const pubDate = tagValue(block, 'pubDate');
    const description = tagValue(block, 'description') || namespacedTag(block, 'description');

    const eventType =
      namespacedTag(block, 'eventtype') ||
      (block.match(/eventtype="([^"]+)"/i)?.[1] ?? '').trim();
    const alertLevel =
      namespacedTag(block, 'alertlevel') ||
      namespacedTag(block, 'episodealertlevel') ||
      (block.match(/alertlevel="([^"]+)"/i)?.[1] ?? '').trim() ||
      alertLevelFromTitle(title);
    const eventId = namespacedTag(block, 'eventid') || `gdacs-${index}`;

    let geometry: HazardGeoJsonFeature['geometry'] | null = null;

    const pointRaw =
      block.match(/<(?:[\w-]+:)?point[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?point>/i)?.[1] ??
      '';
    if (pointRaw) {
      const pos = parseGeorssPoint(stripXmlTags(pointRaw), 'lat-lon');
      if (pos) geometry = { type: 'Point', coordinates: pos };
    }

    if (!geometry) {
      const lat = namespacedTag(block, 'lat') || tagValue(block, 'lat');
      const lon = namespacedTag(block, 'long') || namespacedTag(block, 'lon') || tagValue(block, 'long');
      if (lat && lon) {
        const pos = parseGeorssPoint(`${lat} ${lon}`, 'lat-lon');
        if (pos) geometry = { type: 'Point', coordinates: pos };
      }
    }

    const polyRaw =
      block.match(/<(?:[\w-]+:)?polygon[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?polygon>/i)?.[1] ?? '';
    if (polyRaw) {
      const ring = parseGeorssPolygon(stripXmlTags(polyRaw));
      if (ring) {
        geometry = { type: 'Polygon', coordinates: [ring] };
      }
    }

    const bboxRaw = namespacedTag(block, 'bbox');
    if (!geometry && bboxRaw) {
      const poly = parseGdacsBbox(bboxRaw);
      if (poly) geometry = poly;
    }

    if (!geometry) {
      return null;
    }

    return {
      type: 'Feature',
      id: `gdacs:${eventId}`,
      geometry,
      properties: {
        source: 'gdacs',
        kind: 'global-disaster-alert',
        title,
        link,
        pubDate,
        description: description.slice(0, 2000),
        eventType: eventType || 'unknown',
        alertLevel: alertLevel || 'unknown',
        eventId,
      },
    };
  }

  parseGeoRss(xml: string): HazardGeoJsonFeature[] {
    const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
    const features: HazardGeoJsonFeature[] = [];
    blocks.forEach((block, i) => {
      const f = this.parseItem(block, i);
      if (f) features.push(f);
    });
    return features.slice(0, 80);
  }

  async fetchGeoJson(): Promise<GdacsFetchResult> {
    if (this.redis) {
      try {
        const cached = await this.redis.get(REDIS_KEY);
        if (cached) {
          return JSON.parse(cached) as GdacsFetchResult;
        }
      } catch {
        /* ignore */
      }
    }

    const empty: HazardGeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [],
      properties: { source: 'gdacs', feedUrl: this.feedUrl() },
    };

    try {
      const res = await fetch(this.feedUrl(), {
        headers: { 'User-Agent': 'ICDRRMO-EOC/1.0 (+gdacs-georss)' },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) {
        throw new Error(`GDACS GeoRSS HTTP ${res.status}`);
      }
      const xml = await res.text();
      const features = this.parseGeoRss(xml);
      const payload: GdacsFetchResult = {
        source: 'GDACS GeoRSS',
        fetchedAt: new Date().toISOString(),
        collection: {
          type: 'FeatureCollection',
          features,
          properties: {
            source: 'gdacs',
            feedUrl: this.feedUrl(),
            itemCount: features.length,
          },
        },
      };
      if (this.redis && features.length > 0) {
        await this.redis.setex(REDIS_KEY, this.cacheTtlSec(), JSON.stringify(payload));
      }
      return payload;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`GDACS GeoRSS fetch failed: ${msg}`);
      return {
        source: 'GDACS GeoRSS',
        fetchedAt: new Date().toISOString(),
        collection: empty,
        upstreamError: msg,
      };
    }
  }
}
