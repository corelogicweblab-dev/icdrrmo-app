/** RFC 7946 GeoJSON types for hazard / weather merge output. */

export type GeoJsonPosition = [number, number];

export type GeoJsonPointGeometry = {
  type: 'Point';
  coordinates: GeoJsonPosition;
};

export type GeoJsonPolygonGeometry = {
  type: 'Polygon';
  coordinates: GeoJsonPosition[][];
};

export type GeoJsonGeometry = GeoJsonPointGeometry | GeoJsonPolygonGeometry;

export type HazardGeoJsonFeature = {
  type: 'Feature';
  id?: string;
  geometry: GeoJsonGeometry;
  properties: Record<string, unknown>;
};

export type HazardGeoJsonFeatureCollection = {
  type: 'FeatureCollection';
  features: HazardGeoJsonFeature[];
  properties?: Record<string, unknown>;
};

export type MergedHazardGeoJsonBundle = {
  type: 'FeatureCollection';
  generatedAt: string;
  properties: {
    aoiLabel: string;
    bbox: [number, number, number, number];
    sources: string[];
    upstreamErrors: Record<string, string | undefined>;
  };
  layers: {
    openWeatherMap: HazardGeoJsonFeatureCollection;
    gdacs: HazardGeoJsonFeatureCollection;
    pagasa: HazardGeoJsonFeatureCollection;
  };
  /** Flattened union of all layer features for single Mapbox/Leaflet source. */
  features: HazardGeoJsonFeature[];
};
