import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { parsePagasaHtmlAdvisories } from './pagasa-html.util';

export type PagasaAdvisoryItem = {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  summary: string;
};

const RSS_FALLBACK_URLS = [
  'https://www.pagasa.dost.gov.ph/rss/weather',
  'https://pubfiles.pagasa.dost.gov.ph/rss/',
];

const HTML_FALLBACK_URLS = [
  'https://www.pagasa.dost.gov.ph/weather/weather-advisory',
  'https://www.pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin',
];

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

  private rssUrls(): string[] {
    const custom = process.env.PAGASA_RSS_URL?.trim();
    return custom ? [custom, ...RSS_FALLBACK_URLS] : RSS_FALLBACK_URLS;
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

  private parseRssItems(xml: string): PagasaAdvisoryItem[] {
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

  private async fetchFromHtml(): Promise<PagasaAdvisoryItem[]> {
    const items: PagasaAdvisoryItem[] = [];
    const seen = new Set<string>();
    for (const url of HTML_FALLBACK_URLS) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ICDRRMO-EOC/1.0; +pagasa-html)',
            Accept: 'text/html',
          },
          signal: AbortSignal.timeout(14_000),
        });
        if (!res.ok) continue;
        const html = await res.text();
        for (const a of parsePagasaHtmlAdvisories(html, url)) {
          if (seen.has(a.id)) continue;
          seen.add(a.id);
          items.push({
            id: a.id,
            title: a.title,
            link: a.link,
            pubDate: '',
            summary: a.excerpt,
          });
        }
      } catch {
        /* try next */
      }
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
          const parsed = JSON.parse(cached) as {
            source: string;
            fetchedAt: string;
            items: PagasaAdvisoryItem[];
          };
          if (parsed.items.length > 0) return parsed;
        }
      } catch {
        /* ignore */
      }
    }

    let items: PagasaAdvisoryItem[] = [];
    let source = 'PAGASA RSS';
    const errors: string[] = [];

    for (const rssUrl of this.rssUrls()) {
      try {
        const res = await fetch(rssUrl, {
          headers: { 'User-Agent': 'ICDRRMO-EOC/1.0 (+pagasa-rss)' },
          signal: AbortSignal.timeout(12_000),
        });
        if (!res.ok) {
          errors.push(`RSS ${rssUrl}: HTTP ${res.status}`);
          continue;
        }
        const xml = await res.text();
        items = this.parseRssItems(xml);
        if (items.length > 0) {
          source = 'PAGASA RSS';
          break;
        }
      } catch (e: unknown) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }

    if (!items.length) {
      items = await this.fetchFromHtml();
      source = 'PAGASA Portal HTML';
    }

    const payload = {
      source,
      fetchedAt: new Date().toISOString(),
      items,
      upstreamError: items.length ? undefined : errors.join('; ') || 'No PAGASA advisories',
    };

    if (this.redis && items.length > 0) {
      await this.redis.setex(REDIS_KEY, this.cacheTtlSec(), JSON.stringify(payload));
    }

    if (!items.length) {
      this.logger.warn(`PAGASA advisories empty: ${payload.upstreamError}`);
    }

    return payload;
  }
}
