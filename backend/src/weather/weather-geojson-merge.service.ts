import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import type { MergedHazardGeoJsonBundle } from './geojson.types';
import { buildOwmRasterFeatures, ISABELA_AOI_BBOX } from './geojson-parse.util';
import { GdacsGeorssService } from './gdacs-georss.service';
import { PagasaPortalService } from './pagasa-portal.service';
import { PagasaRssService, type PagasaAdvisoryItem } from './pagasa-rss.service';
import { WeatherService } from './weather.service';
import type { HazardGeoJsonFeature } from './geojson.types';
import { offsetPoint, PH_CENTER } from './geojson-parse.util';

const REDIS_MERGE_KEY = 'icd:v1:weather:geojson:merged';

@Injectable()
export class WeatherGeojsonMergeService {
  private redis: Redis | null = null;

  constructor(
    private readonly weather: WeatherService,
    private readonly gdacs: GdacsGeorssService,
    private readonly pagasaPortal: PagasaPortalService,
    private readonly pagasaRss: PagasaRssService,
  ) {
    const url = process.env.REDIS_URL?.trim();
    if (url && process.env.NODE_ENV !== 'test') {
      try {
        this.redis = new Redis(url, { maxRetriesPerRequest: 2 });
      } catch {
        this.redis = null;
      }
    }
  }

  private mergeTtlSec(): number {
    const sec = Number(process.env.WEATHER_GEOJSON_CACHE_TTL_SEC);
    return Number.isFinite(sec) && sec >= 120 ? Math.floor(sec) : 600;
  }

  private rssItemsToFeatures(items: PagasaAdvisoryItem[]): HazardGeoJsonFeature[] {
    return items.map((item, i) => ({
      type: 'Feature' as const,
      id: `pagasa-rss:${item.id.slice(0, 100)}`,
      geometry: {
        type: 'Point' as const,
        coordinates: offsetPoint(PH_CENTER, i + 50),
      },
      properties: {
        source: 'pagasa',
        kind: 'rss-advisory',
        channel: 'PAGASA RSS',
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        summary: item.summary,
      },
    }));
  }

  async buildMergedGeoJson(): Promise<MergedHazardGeoJsonBundle> {
    if (this.redis) {
      try {
        const cached = await this.redis.get(REDIS_MERGE_KEY);
        if (cached) {
          return JSON.parse(cached) as MergedHazardGeoJsonBundle;
        }
      } catch {
        /* ignore */
      }
    }

    const owmConfig = this.weather.getOpenWeatherLayers();
    const [gdacsResult, pagasaPortalResult, pagasaRssResult] = await Promise.all([
      this.gdacs.fetchGeoJson(),
      this.pagasaPortal.fetchGeoJson(),
      this.pagasaRss.fetchAdvisories(),
    ]);

    const owmFeatures = buildOwmRasterFeatures(
      owmConfig.layers.map((l) => ({
        id: l.id,
        label: l.label,
        urlTemplate: l.urlTemplate,
      })),
      ISABELA_AOI_BBOX,
    );

    const owmLayer: MergedHazardGeoJsonBundle['layers']['openWeatherMap'] = {
      type: 'FeatureCollection',
      features: owmFeatures,
      properties: {
        source: 'openweathermap',
        configured: owmConfig.configured,
        kind: 'raster-tile-background',
        note: owmConfig.configured
          ? 'Polygon AOI carries tile URL templates for map clients.'
          : 'Set OPENWEATHERMAP_API_KEY to enable OWM raster layers.',
      },
    };

    const portalFeatures = pagasaPortalResult.collection.features;
    const rssFeatures = this.rssItemsToFeatures(pagasaRssResult.items);
    const pagasaFeatures = [...portalFeatures, ...rssFeatures];

    const pagasaLayer: MergedHazardGeoJsonBundle['layers']['pagasa'] = {
      type: 'FeatureCollection',
      features: pagasaFeatures,
      properties: {
        source: 'pagasa',
        portalUrl: process.env.PAGASA_PORTAL_URL ?? 'https://www.pagasa.dost.gov.ph/',
        portalCount: portalFeatures.length,
        rssCount: rssFeatures.length,
      },
    };

    const gdacsLayer = gdacsResult.collection;

    const upstreamErrors: Record<string, string | undefined> = {
      gdacs: gdacsResult.upstreamError,
      pagasaPortal: pagasaPortalResult.upstreamError,
      pagasaRss: pagasaRssResult.upstreamError,
    };

    const bundle: MergedHazardGeoJsonBundle = {
      type: 'FeatureCollection',
      generatedAt: new Date().toISOString(),
      properties: {
        aoiLabel: 'Isabela City, Basilan (OWM tiles) · Philippines (PAGASA/GDACS)',
        bbox: ISABELA_AOI_BBOX,
        sources: [
          'openweathermap',
          'gdacs',
          'pagasa-portal',
          'pagasa-rss',
        ],
        upstreamErrors,
      },
      layers: {
        openWeatherMap: owmLayer,
        gdacs: gdacsLayer,
        pagasa: pagasaLayer,
      },
      features: [
        ...owmFeatures,
        ...gdacsLayer.features,
        ...pagasaFeatures,
      ],
    };

    if (this.redis) {
      try {
        await this.redis.setex(
          REDIS_MERGE_KEY,
          this.mergeTtlSec(),
          JSON.stringify(bundle),
        );
      } catch {
        /* ignore */
      }
    }

    return bundle;
  }
}
