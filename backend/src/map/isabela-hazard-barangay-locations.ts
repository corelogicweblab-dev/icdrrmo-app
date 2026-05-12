/**
 * Approximate barangay reference points (WGS84) for hazard map pins — Isabela City, Basilan.
 * Sourced from OpenStreetMap / Nominatim where available; others use a city centroid until LGU publishes centroids.
 * Keep codes aligned with `isabela-hazard-reference.ts` and `prisma/seed.ts`.
 */
import { ISABELA_HAZARD_ZONES } from '../weather/isabela-hazard-reference';

const DEFAULT = { lat: 6.7042, lng: 121.9715 };

const COORDS_BY_CODE: Record<string, { lat: number; lng: number }> = {
  'IC-001': { lat: 6.6967332, lng: 121.9691678 }, // Aguada
  'IC-003': { lat: 6.7188447, lng: 122.028206 }, // Baluno
  'IC-004': { lat: 6.688533, lng: 122.0146664 }, // Begang
  'IC-006': { lat: 6.6895187, lng: 122.0051102 }, // Busay
  'IC-009': { lat: 6.7068, lng: 121.9725 }, // Carbon (approx.)
  'IC-012': { lat: 6.7042907, lng: 121.9723843 }, // Isabela Proper
  'IC-018': { lat: 6.6884, lng: 122.0188 }, // Kapayawan (approx. upland)
  'IC-021': { lat: 6.6875221, lng: 121.8788099 }, // Lampinigan
  'IC-022': { lat: 6.6988152, lng: 121.9756309 }, // Lanote
  'IC-025': { lat: 6.6586762, lng: 121.9256495 }, // Makiri
  'IC-026': { lat: 6.6912, lng: 122.0123 }, // Maligue (approx.)
  'IC-027': { lat: 6.7428145, lng: 121.9762878 }, // Marang-marang
  'IC-028': { lat: 6.7075136, lng: 121.9734798 }, // Marketsite
  'IC-030': { lat: 6.691425, lng: 121.9691389 }, // Menzi
  'IC-031': { lat: 6.7112789, lng: 121.9450446 }, // Panigayan
  'IC-033': { lat: 6.7071001, lng: 121.9706436 }, // Port Area
  'IC-034': { lat: 6.7042186, lng: 121.9678389 }, // Riverside
  'IC-037': { lat: 6.7052691, lng: 121.9710286 }, // Santa Cruz (city plaza node)
  'IC-038': { lat: 6.7099109, lng: 121.9735756 }, // Seaside
  'IC-039': { lat: 6.6962, lng: 121.9585 }, // Small Kapatagan (approx.)
  'IC-040': { lat: 6.694426, lng: 121.9616268 }, // Sumagdang
  'IC-043': { lat: 6.7020614, lng: 121.9620968 }, // Tabuk
  'IC-044': { lat: 6.710088, lng: 121.9645058 }, // Tampalan
};

export type HazardBarangayPinDto = {
  code: string;
  name: string;
  /** Flood = coastal + riverine reference zones; landslide = upland reference zone. */
  hazardKind: 'flood' | 'landslide';
  latitude: number;
  longitude: number;
};

export function getIsabelaHazardBarangayPins(): HazardBarangayPinDto[] {
  const out: HazardBarangayPinDto[] = [];
  for (const zone of ISABELA_HAZARD_ZONES) {
    const hazardKind = zone.type === 'LANDSLIDE' ? 'landslide' : 'flood';
    for (const b of zone.barangays) {
      const c = COORDS_BY_CODE[b.code] ?? DEFAULT;
      out.push({
        code: b.code,
        name: b.name,
        hazardKind,
        latitude: c.lat,
        longitude: c.lng,
      });
    }
  }
  return out;
}
