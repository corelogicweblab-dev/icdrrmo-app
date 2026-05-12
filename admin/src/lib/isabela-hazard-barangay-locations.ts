/**
 * Hazard reference pins for Leaflet / OSM maps (admin). **Keep in sync** with
 * `backend/src/map/isabela-hazard-barangay-locations.ts` and `backend/src/weather/isabela-hazard-reference.ts`.
 */
export type HazardBarangayMapPin = {
  code: string;
  name: string;
  hazardKind: "flood" | "landslide";
  latitude: number;
  longitude: number;
};

export const ISABELA_HAZARD_BARANGAY_PINS: HazardBarangayMapPin[] = [
  { code: "IC-033", name: "Port Area", hazardKind: "flood", latitude: 6.7071001, longitude: 121.9706436 },
  { code: "IC-038", name: "Seaside", hazardKind: "flood", latitude: 6.7099109, longitude: 121.9735756 },
  { code: "IC-034", name: "Riverside", hazardKind: "flood", latitude: 6.7042186, longitude: 121.9678389 },
  { code: "IC-028", name: "Marketsite", hazardKind: "flood", latitude: 6.7075136, longitude: 121.9734798 },
  { code: "IC-021", name: "Lampinigan", hazardKind: "flood", latitude: 6.6875221, longitude: 121.8788099 },
  { code: "IC-031", name: "Panigayan", hazardKind: "flood", latitude: 6.7112789, longitude: 121.9450446 },
  { code: "IC-044", name: "Tampalan", hazardKind: "flood", latitude: 6.710088, longitude: 121.9645058 },
  { code: "IC-012", name: "Isabela Proper", hazardKind: "flood", latitude: 6.7042907, longitude: 121.9723843 },
  { code: "IC-037", name: "Santa Cruz", hazardKind: "flood", latitude: 6.7052691, longitude: 121.9710286 },
  { code: "IC-009", name: "Carbon", hazardKind: "flood", latitude: 6.7068, longitude: 121.9725 },
  { code: "IC-030", name: "Menzi", hazardKind: "flood", latitude: 6.691425, longitude: 121.9691389 },
  { code: "IC-040", name: "Sumagdang", hazardKind: "flood", latitude: 6.694426, longitude: 121.9616268 },
  { code: "IC-027", name: "Marang-marang", hazardKind: "flood", latitude: 6.7428145, longitude: 121.9762878 },
  { code: "IC-001", name: "Aguada", hazardKind: "flood", latitude: 6.6967332, longitude: 121.9691678 },
  { code: "IC-039", name: "Small Kapatagan", hazardKind: "flood", latitude: 6.6962, longitude: 121.9585 },
  { code: "IC-003", name: "Baluno", hazardKind: "landslide", latitude: 6.7188447, longitude: 122.028206 },
  { code: "IC-006", name: "Busay", hazardKind: "landslide", latitude: 6.6895187, longitude: 122.0051102 },
  { code: "IC-022", name: "Lanote", hazardKind: "landslide", latitude: 6.6988152, longitude: 121.9756309 },
  { code: "IC-025", name: "Makiri", hazardKind: "landslide", latitude: 6.6586762, longitude: 121.9256495 },
  { code: "IC-043", name: "Tabuk", hazardKind: "landslide", latitude: 6.7020614, longitude: 121.9620968 },
  { code: "IC-026", name: "Maligue", hazardKind: "landslide", latitude: 6.6912, longitude: 122.0123 },
  { code: "IC-018", name: "Kapayawan", hazardKind: "landslide", latitude: 6.6884, longitude: 122.0188 },
  { code: "IC-004", name: "Begang", hazardKind: "landslide", latitude: 6.688533, longitude: 122.0146664 },
];

export function hazardPinsForLayers(layerToggles: Record<string, boolean> | undefined): HazardBarangayMapPin[] {
  if (layerToggles === undefined) {
    return ISABELA_HAZARD_BARANGAY_PINS;
  }
  const flood = Boolean(layerToggles["Flood-prone zones"]);
  const slide = Boolean(layerToggles["Landslide polygons"]);
  if (!flood && !slide) return [];
  return ISABELA_HAZARD_BARANGAY_PINS.filter((p) => {
    if (p.hazardKind === "flood") return flood;
    return slide;
  });
}
