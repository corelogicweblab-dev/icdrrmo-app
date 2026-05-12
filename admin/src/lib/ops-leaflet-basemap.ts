/**
 * Basemap for ops / citizen Leaflet maps — Esri World Street Map (English-first labels).
 * Default OSM.org tiles follow `name:*` tags; East Asia views often render Chinese script.
 */
export const OPS_LEAFLET_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";

export const OPS_LEAFLET_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors · Tiles &copy; <a href="https://www.esri.com/">Esri</a> (World Street Map)';
