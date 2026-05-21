import { stripXmlTags } from './geojson-parse.util';

export type PagasaHtmlAdvisory = {
  id: string;
  title: string;
  link: string;
  excerpt: string;
};

const KEYWORDS =
  /weather|advisory|bulletin|tropical|cyclone|typhoon|rainfall|flood|warning|signal|bagyo|forecast|severe/i;

export function parsePagasaHtmlAdvisories(html: string, baseUrl: string): PagasaHtmlAdvisory[] {
  const advisories: PagasaHtmlAdvisory[] = [];
  const seen = new Set<string>();

  const abs = (href: string): string => {
    const h = href.trim();
    if (!h || h.startsWith('#')) return '';
    if (h.startsWith('http')) return h;
    try {
      return new URL(h, baseUrl).href;
    } catch {
      return h;
    }
  };

  const linkRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const text = stripXmlTags(m[2]);
    if (!text || text.length < 14 || text.length > 240) continue;
    if (!KEYWORDS.test(`${m[1]} ${text}`)) continue;
    const link = abs(m[1]);
    if (!link || seen.has(link)) continue;
    seen.add(link);
    advisories.push({
      id: link,
      title: text,
      link,
      excerpt: text,
    });
    if (advisories.length >= 30) break;
  }

  const articleRe =
    /<article[^>]*>([\s\S]*?)<\/article>|<div[^>]+class="[^"]*(?:content|post|entry)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  while ((m = articleRe.exec(html)) !== null) {
    const block = m[1] ?? m[2] ?? '';
    const title = stripXmlTags(
      block.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i)?.[1] ?? '',
    );
    if (!title || title.length < 12) continue;
    const body = stripXmlTags(
      block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? '',
    );
    const id = `article:${title.slice(0, 50)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    advisories.push({
      id,
      title,
      link: baseUrl,
      excerpt: (body || title).slice(0, 800),
    });
    if (advisories.length >= 35) break;
  }

  return advisories.slice(0, 25);
}
