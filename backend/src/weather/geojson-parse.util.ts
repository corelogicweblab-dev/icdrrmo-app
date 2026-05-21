import type {
  GeoJsonPolygonGeometry,
  GeoJsonPosition,
  HazardGeoJsonFeature,
} from './geojson.types';

/** Isabela City + Sulu Sea context bbox [minLon, minLat, maxLon, maxLat]. */
export const ISABELA_AOI_BBOX: [number, number, number, number] = [
  121.75, 6.55, 122.25, 6.85,
];

/** Philippines-wide context for GDACS / PAGASA without coordinates. */
export const PH_CENTER: GeoJsonPosition = [121.774, 12.8797];

export function bboxToPolygon(bbox: [number, number, number, number]): GeoJsonPolygonGeometry {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return {
    type: 'Polygon',
    coordinates: [
      [
        [minLon, minLat],
        [maxLon, minLat],
        [maxLon, maxLat],
        [minLon, maxLat],
        [minLon, minLat],
      ],
    ],
  };
}

/** Parse `lat lon` or `lon lat` — GDACS GeoRSS uses "lat lon" in georss:point. */
export function parseGeorssPoint(raw: string, order: 'lat-lon' | 'lon-lat' = 'lat-lon'): GeoJsonPosition | null {
  const parts = raw.trim().split(/[\s,]+/).map(Number);
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
    return null;
  }
  const [a, b] = parts;
  if (order === 'lat-lon') {
    return [b, a];
  }
  return [a, b];
}

export function parseGeorssPolygon(raw: string): GeoJsonPosition[] | null {
  const nums = raw.trim().split(/[\s,]+/).map(Number);
  if (nums.length < 6 || nums.length % 2 !== 0) return null;
  const ring: GeoJsonPosition[] = [];
  for (let i = 0; i < nums.length; i += 2) {
    const lat = nums[i];
    const lon = nums[i + 1];
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    ring.push([lon, lat]);
  }
  if (ring.length < 3) return null;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }
  return ring;
}

export function stripXmlTags(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tagValue(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  return stripXmlTags(block.match(re)?.[1] ?? '');
}

export function namespacedTag(block: string, localName: string): string {
  const re = new RegExp(
    `<(?:[\\w-]+:)?${localName}[^>]*>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${localName}>`,
    'i',
  );
  return stripXmlTags(block.match(re)?.[1] ?? '');
}

export function offsetPoint(base: GeoJsonPosition, index: number): GeoJsonPosition {
  const d = index * 0.018;
  return [base[0] + d * 0.7, base[1] + d * 0.35];
}

/** GDACS bbox: lonmin lonmax latmin latmax */
export function parseGdacsBbox(raw: string): GeoJsonPolygonGeometry | null {
  const parts = raw.trim().split(/\s+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [lonMin, lonMax, latMin, latMax] = parts;
  return bboxToPolygon([lonMin, latMin, lonMax, latMax]);
}

export function alertLevelFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('red')) return 'Red';
  if (t.includes('orange')) return 'Orange';
  if (t.includes('green')) return 'Green';
  return 'unknown';
}

export function buildOwmRasterFeatures(
  layers: Array<{ id: string; label: string; urlTemplate: string }>,
  bbox: [number, number, number, number],
): HazardGeoJsonFeature[] {
  const geometry = bboxToPolygon(bbox);
  return layers.map((layer) => ({
    type: 'Feature' as const,
    id: `owm:${layer.id}`,
    geometry,
    properties: {
      source: 'openweathermap',
      kind: 'raster-tile-layer',
      layerId: layer.id,
      label: layer.label,
      urlTemplate: layer.urlTemplate,
      opacity: 0.6,
      minZoom: 0,
      maxZoom: 19,
    },
  }));
}
