import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

export type PagasaAdvisoryItem = {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  summary: string;
};

const DEFAULT_RSS_URL = 'https://www.pagasa.dost.gov.ph/rss/weather';
const REDIS_KEY = 'icd:v1:weather:pagasa';

@Injectable()
export class PagasaRssService {
  private readonly logger = new Logger(PagasaRssService.name);
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

  private rssUrl(): string {
    return process.env.PAGASA_RSS_URL?.trim() || DEFAULT_RSS_URL;
  }

  private cacheTtlSec(): number {
    const sec = Number(process.env.PAGASA_CACHE_TTL_SEC);
    return Number.isFinite(sec) && sec >= 300 ? Math.floor(sec) : 1800;
  }

  private decodeCdata(raw: string): string {
    return raw
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private parseItems(xml: string): PagasaAdvisoryItem[] {
    const items: PagasaAdvisoryItem[] = [];
    const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
    for (const block of blocks.slice(0, 25)) {
      const title = this.decodeCdata(
        block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '',
      );
      const link = (block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? '').trim();
      const pubDate = (block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] ?? '').trim();
      const desc = this.decodeCdata(
        block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ?? '',
      );
      if (!title) continue;
      items.push({
        id: link || `${title.slice(0, 40)}-${pubDate}`,
        title,
        link,
        pubDate,
        summary: desc.slice(0, 500),
      });
    }
    return items;
  }

  async fetchAdvisories(): Promise<{
    source: string;
    fetchedAt: string;
    items: PagasaAdvisoryItem[];
    upstreamError?: string;
  }> {
    if (this.redis) {
      try {
        const cached = await this.redis.get(REDIS_KEY);
        if (cached) {
          return JSON.parse(cached) as {
            source: string;
            fetchedAt: string;
            items: PagasaAdvisoryItem[];
          };
        }
      } catch {
        /* ignore */
      }
    }

    try {
      const res = await fetch(this.rssUrl(), {
        headers: { 'User-Agent': 'ICDRRMO-EOC/1.0 (+pagasa-rss)' },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) {
        throw new Error(`PAGASA RSS HTTP ${res.status}`);
      }
      const xml = await res.text();
      const payload = {
        source: 'PAGASA RSS',
        fetchedAt: new Date().toISOString(),
        items: this.parseItems(xml),
      };
      if (this.redis) {
        await this.redis.setex(REDIS_KEY, this.cacheTtlSec(), JSON.stringify(payload));
      }
      return payload;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`PAGASA RSS fetch failed: ${msg}`);
      return {
        source: 'PAGASA RSS',
        fetchedAt: new Date().toISOString(),
        items: [],
        upstreamError: msg,
      };
    }
  }
}
