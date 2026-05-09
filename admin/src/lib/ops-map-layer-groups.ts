/** Layer control groups — labels must match `SituationMap` Mapbox visibility sync. */
export const OPS_MAP_LAYER_GROUPS = [
  {
    title: "Positions",
    items: ["Live citizens", "Live responders", "Ambulance / rescue units", "Vehicle tracking"],
  },
  {
    title: "Incidents & analysis",
    items: ["Incident markers", "Incident clusters", "Heatmaps", "Historical density"],
  },
  {
    title: "Hazard overlays",
    items: ["Flood-prone zones", "Landslide polygons", "Earthquake shake", "Typhoon cones"],
  },
  {
    title: "Operational overlays",
    items: ["Barangay boundaries", "Evacuation centers", "Heavy traffic / closures", "Weather radar"],
  },
] as const;

export function defaultOpsMapLayerToggles(): Record<string, boolean> {
  return Object.fromEntries(
    OPS_MAP_LAYER_GROUPS.flatMap((g) => g.items.map((i) => [i, i === "Incident markers"])),
  );
}
