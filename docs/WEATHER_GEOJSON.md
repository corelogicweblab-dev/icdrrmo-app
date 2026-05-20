# Weather / hazard GeoJSON merge API

Single endpoint merges three upstream sources into **RFC 7946 GeoJSON** for Mapbox, Leaflet, or GIS clients.

## Endpoint

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/weather/geojson` | JWT (ops, citizen, chairman, responder, auditor) |

## Response shape

```json
{
  "type": "FeatureCollection",
  "generatedAt": "2026-05-20T12:00:00.000Z",
  "properties": {
    "aoiLabel": "Isabela City, Basilan (OWM tiles) · Philippines (PAGASA/GDACS)",
    "bbox": [121.75, 6.55, 122.25, 6.85],
    "sources": ["openweathermap", "gdacs", "pagasa-portal", "pagasa-rss"],
    "upstreamErrors": { "gdacs": null, "pagasaPortal": null, "pagasaRss": null }
  },
  "layers": {
    "openWeatherMap": { "type": "FeatureCollection", "features": [...] },
    "gdacs": { "type": "FeatureCollection", "features": [...] },
    "pagasa": { "type": "FeatureCollection", "features": [...] }
  },
  "features": [ "...flattened union..." ]
}
```

### Layer semantics

| Layer | GeoJSON `properties.kind` | Geometry |
|-------|---------------------------|----------|
| **OpenWeatherMap** | `raster-tile-layer` | Polygon over Isabela AOI; `urlTemplate` for Leaflet/Mapbox raster |
| **GDACS** | `global-disaster-alert` | Point or Polygon from GeoRSS (`georss:point` / `georss:polygon`) |
| **PAGASA portal** | `official-advisory` | Point (Philippines grid offset) + `title`, `link`, `excerpt` |
| **PAGASA RSS** | `rss-advisory` | Point + RSS `summary` / `pubDate` |

OWM tiles are not raster pixels in GeoJSON — they are **tile-layer metadata** bound to a polygon AOI so clients can `L.tileLayer(urlTemplate)` or Mapbox raster sources.

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPENWEATHERMAP_API_KEY` | — | OWM tile URL templates in `layers.openWeatherMap` |
| `GDACS_GEORSS_URL` | `https://www.gdacs.org/xml/rss.xml` | GDACS feed |
| `GDACS_CACHE_TTL_SEC` | `900` | Redis cache |
| `PAGASA_PORTAL_URL` | `https://www.pagasa.dost.gov.ph/` | Portal HTML scrape |
| `PAGASA_PORTAL_CACHE_TTL_SEC` | `1800` | Portal cache |
| `PAGASA_RSS_URL` | PAGASA weather RSS | Fallback / supplement advisories |
| `WEATHER_GEOJSON_CACHE_TTL_SEC` | `600` | Full merge cache |
| `REDIS_URL` | — | Shared cache (recommended in production) |

## Services (Nest)

- `GdacsGeorssService` — GeoRSS → alert features  
- `PagasaPortalService` — portal HTML → advisory features  
- `PagasaRssService` — existing RSS → features  
- `WeatherGeojsonMergeService` — parallel fetch + merge  

## Client usage

```typescript
const fc = await opsFetchJson<MergedHazardGeoJsonBundle>('/weather/geojson', token);
map.addSource('hazards', { type: 'geojson', data: fc });
// OWM: fc.layers.openWeatherMap.features[0].properties.urlTemplate
// GDACS points: fc.layers.gdacs.features
```
