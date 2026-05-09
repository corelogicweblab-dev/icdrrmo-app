import type mapboxgl from "mapbox-gl";

import { pinsToFeatureCollection } from "@/lib/map-pins";

/** Empty GeoJSON — overlay feeds attach here later via `setData`. */
const EMPTY_FC = {
  type: "FeatureCollection" as const,
  features: [] as [],
};

const SRC_RAW = "icd-incidents-raw";
const SRC_CLUSTER = "icd-incidents-cluster";
const SRC_STUBS = "icd-stubs";

/** UI label → Mapbox layer ids (visibility toggled together). */
const LABEL_TO_LAYERS: Record<string, string[]> = {
  Heatmaps: ["icd-heatmap"],
  "Historical density": ["icd-heatmap-historical"],
  "Incident clusters": ["icd-clusters", "icd-cluster-count", "icd-unclustered-point"],
  "Live citizens": ["icd-stub-citizens"],
  "Live responders": ["icd-stub-responders"],
  "Ambulance / rescue units": ["icd-stub-ambulance"],
  "Vehicle tracking": ["icd-stub-vehicles"],
  "Flood-prone zones": ["icd-stub-flood"],
  "Landslide polygons": ["icd-stub-landslide"],
  "Earthquake shake": ["icd-stub-earthquake"],
  "Typhoon cones": ["icd-stub-typhoon"],
  "Barangay boundaries": ["icd-stub-barangay"],
  "Evacuation centers": ["icd-stub-evac"],
  "Heavy traffic / closures": ["icd-stub-traffic"],
  "Weather radar": ["icd-stub-radar"],
};

const STUB_KEYS: Array<{ id: string; filterKey: string }> = [
  { id: "icd-stub-citizens", filterKey: "citizens" },
  { id: "icd-stub-responders", filterKey: "responders" },
  { id: "icd-stub-ambulance", filterKey: "ambulance" },
  { id: "icd-stub-vehicles", filterKey: "vehicles" },
  { id: "icd-stub-flood", filterKey: "flood" },
  { id: "icd-stub-landslide", filterKey: "landslide" },
  { id: "icd-stub-earthquake", filterKey: "earthquake" },
  { id: "icd-stub-typhoon", filterKey: "typhoon" },
  { id: "icd-stub-barangay", filterKey: "barangay" },
  { id: "icd-stub-evac", filterKey: "evac" },
  { id: "icd-stub-traffic", filterKey: "traffic" },
  { id: "icd-stub-radar", filterKey: "radar" },
];

function safeSetVisibility(map: mapboxgl.Map, layerId: string, visible: boolean): void {
  if (!map.getLayer(layerId)) return;
  map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
}

/** Add incident + stub sources/layers once per map instance. */
export function installIcdOpsMapLayers(map: mapboxgl.Map): void {
  if (map.getSource(SRC_RAW)) return;

  map.addSource(SRC_RAW, { type: "geojson", data: EMPTY_FC });

  map.addLayer({
    id: "icd-heatmap",
    type: "heatmap",
    source: SRC_RAW,
    maxzoom: 16,
    paint: {
      "heatmap-weight": 1,
      "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 0.8, 14, 2.2],
      "heatmap-color": [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0,
        "rgba(8, 12, 20, 0)",
        0.15,
        "rgba(56, 189, 248, 0.35)",
        0.45,
        "rgba(244, 63, 94, 0.65)",
        1,
        "rgba(251, 191, 36, 0.85)",
      ],
      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 8, 12, 16, 28],
      "heatmap-opacity": 0.82,
    },
    layout: { visibility: "none" },
  });

  map.addLayer({
    id: "icd-heatmap-historical",
    type: "heatmap",
    source: SRC_RAW,
    maxzoom: 16,
    paint: {
      "heatmap-weight": 0.55,
      "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 0.4, 14, 1.2],
      "heatmap-color": [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0,
        "rgba(0,0,0,0)",
        0.3,
        "rgba(99, 102, 241, 0.45)",
        1,
        "rgba(167, 139, 250, 0.55)",
      ],
      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 8, 28, 16, 64],
      "heatmap-opacity": 0.42,
    },
    layout: { visibility: "none" },
  });

  map.addSource(SRC_CLUSTER, {
    type: "geojson",
    data: EMPTY_FC,
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 56,
  });

  map.addLayer({
    id: "icd-clusters",
    type: "circle",
    source: SRC_CLUSTER,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": ["step", ["get", "point_count"], "#38bdf8", 8, "#60a5fa", 20, "#2563eb", 50, "#1d4ed8"],
      "circle-radius": ["step", ["get", "point_count"], 14, 8, 18, 20, 24, 50, 30],
      "circle-opacity": 0.92,
      "circle-stroke-width": 2,
      "circle-stroke-color": "rgba(255,255,255,0.9)",
    },
    layout: { visibility: "none" },
  });

  map.addLayer({
    id: "icd-cluster-count",
    type: "symbol",
    source: SRC_CLUSTER,
    filter: ["has", "point_count"],
    layout: {
      visibility: "none",
      "text-field": "{point_count_abbreviated}",
      "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
      "text-size": 12,
    },
    paint: { "text-color": "#0f172a" },
  });

  map.addLayer({
    id: "icd-unclustered-point",
    type: "circle",
    source: SRC_CLUSTER,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": "#f43f5e",
      "circle-radius": 7,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#fff",
      "circle-opacity": 0.95,
    },
    layout: { visibility: "none" },
  });

  map.addSource(SRC_STUBS, { type: "geojson", data: EMPTY_FC });
  for (const { id, filterKey } of STUB_KEYS) {
    map.addLayer({
      id,
      type: "circle",
      source: SRC_STUBS,
      filter: ["==", ["get", "layer"], filterKey],
      paint: {
        "circle-radius": 0.001,
        "circle-opacity": 0,
      },
      layout: { visibility: "none" },
    });
  }
}

export function setIncidentGeoJson(
  map: mapboxgl.Map,
  fc: ReturnType<typeof pinsToFeatureCollection>,
): void {
  const raw = map.getSource(SRC_RAW) as mapboxgl.GeoJSONSource | undefined;
  const cl = map.getSource(SRC_CLUSTER) as mapboxgl.GeoJSONSource | undefined;
  if (raw) raw.setData(fc as never);
  if (cl) cl.setData(fc as never);
}

/** Sync checkbox state → Mapbox layer visibility. `undefined` = dashboard (only incident HTML markers; map layers off). */
export function syncOpsMapLayerVisibility(
  map: mapboxgl.Map,
  layerToggles: Record<string, boolean> | undefined,
): void {
  const isGisPage = layerToggles !== undefined;

  for (const [label, layerIds] of Object.entries(LABEL_TO_LAYERS)) {
    const on = isGisPage && Boolean(layerToggles[label]);
    for (const lid of layerIds) {
      safeSetVisibility(map, lid, on);
    }
  }

}

/** Zoom into cluster on click (GIS usability). */
export function bindClusterExpansionClick(map: mapboxgl.Map): () => void {
  const onClusterClick = (e: mapboxgl.MapLayerMouseEvent): void => {
    const feats = map.queryRenderedFeatures(e.point, { layers: ["icd-clusters"] });
    const f = feats[0];
    const props = f?.properties as { cluster_id?: number } | undefined;
    const clusterId = props?.cluster_id;
    if (typeof clusterId !== "number") return;
    const src = map.getSource(SRC_CLUSTER) as mapboxgl.GeoJSONSource;
    src.getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err || zoom == null) return;
      map.easeTo({ center: [e.lngLat.lng, e.lngLat.lat], zoom, duration: 380 });
    });
  };
  const onEnter = (): void => {
    map.getCanvas().style.cursor = "pointer";
  };
  const onLeave = (): void => {
    map.getCanvas().style.cursor = "";
  };
  map.on("click", "icd-clusters", onClusterClick);
  map.on("mouseenter", "icd-clusters", onEnter);
  map.on("mouseleave", "icd-clusters", onLeave);
  return () => {
    map.off("click", "icd-clusters", onClusterClick);
    map.off("mouseenter", "icd-clusters", onEnter);
    map.off("mouseleave", "icd-clusters", onLeave);
  };
}
