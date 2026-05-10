"use client";

import type { ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { MapIncidentPin } from "@/lib/map-pins";
import { markerColorForIncidentType, pinsToFeatureCollection } from "@/lib/map-pins";
import { ISABELA_MAP_CENTER_LNGLAT } from "@/lib/isabela-eoc";
import { SituationMapOsmFallback } from "@/components/situation-map-osm-fallback";
import {
  bindClusterExpansionClick,
  installIcdOpsMapLayers,
  setIncidentGeoJson,
  syncOpsMapLayerVisibility,
} from "@/components/situation-map-style";

/** Inline `NEXT_PUBLIC_*` so the client bundle always picks up `.env.local` / Docker build args. */
function readMapboxToken(): string {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? "";
}

export type SituationMapProps = {
  incidentPins?: MapIncidentPin[];
  /** When passed (GIS page), heatmap / cluster / stub visibility follows ops checkboxes. Omit on dashboard. */
  layerToggles?: Record<string, boolean>;
};

export function SituationMap(props: SituationMapProps): ReactElement {
  const { incidentPins: incidentPinsProp, layerToggles } = props;
  const pins = useMemo(() => incidentPinsProp ?? [], [incidentPinsProp]);
  const fc = useMemo(() => pinsToFeatureCollection(pins), [pins]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const unbindClusterRef = useRef<(() => void) | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const token = readMapboxToken();

  const showHtmlMarkers = layerToggles === undefined ? true : Boolean(layerToggles["Incident markers"]);

  useEffect(() => {
    if (!token || !containerRef.current) return;

    mapboxgl.accessToken = token;
    const el = containerRef.current;
    const map = new mapboxgl.Map({
      container: el,
      style: "mapbox://styles/mapbox/dark-v11",
      center: ISABELA_MAP_CENTER_LNGLAT,
      zoom: 12.2,
      attributionControl: true,
      cooperativeGestures: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    mapRef.current = map;

    const bumpResize = (): void => {
      requestAnimationFrame(() => {
        map.resize();
      });
    };

    const onLoad = (): void => {
      installIcdOpsMapLayers(map);
      unbindClusterRef.current = bindClusterExpansionClick(map);
      bumpResize();
      setMapReady(true);
    };
    map.once("load", onLoad);

    const onWinResize = (): void => {
      map.resize();
    };
    window.addEventListener("resize", onWinResize);

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            map.resize();
          })
        : null;
    ro?.observe(el);
    bumpResize();

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", onWinResize);
      map.off("load", onLoad);
      unbindClusterRef.current?.();
      unbindClusterRef.current = null;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      setMapReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !mapRef.current || !mapReady) return;
    const map = mapRef.current;
    setIncidentGeoJson(map, fc);
    syncOpsMapLayerVisibility(map, layerToggles);
  }, [fc, layerToggles, mapReady, token]);

  useEffect(() => {
    if (!token || !mapRef.current || !mapReady) return;
    const map = mapRef.current;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (showHtmlMarkers) {
      for (const p of pins) {
        const el = document.createElement("div");
        el.style.width = "14px";
        el.style.height = "14px";
        el.style.borderRadius = "9999px";
        el.style.border = "2px solid rgba(255,255,255,0.95)";
        el.style.background = markerColorForIncidentType(p.type);
        el.style.boxShadow = "0 0 10px rgba(0,0,0,0.55)";
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([p.lng, p.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 14, maxWidth: "240px" }).setHTML(
              `<div class="text-xs font-sans text-zinc-800"><strong>${escapeHtml(p.label)}</strong><br/><span class="font-mono text-[10px] opacity-80">${escapeHtml(p.id)}</span></div>`,
            ),
          )
          .addTo(map);
        markersRef.current.push(marker);
      }
    }

    if (pins.length > 0) {
      const b = new mapboxgl.LngLatBounds();
      pins.forEach((p) => b.extend([p.lng, p.lat]));
      map.fitBounds(b, { padding: 56, maxZoom: 14.5, duration: 600 });
    } else {
      map.flyTo({ center: ISABELA_MAP_CENTER_LNGLAT, zoom: 12.2, duration: 400 });
    }
  }, [pins, mapReady, token, showHtmlMarkers]);

  if (!token) {
    return <SituationMapOsmFallback pins={pins} showMarkers={showHtmlMarkers} />;
  }

  const gisHud =
    layerToggles !== undefined ? (
      <div className="pointer-events-none absolute right-3 top-3 z-10 max-w-[200px] rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 text-[9px] font-mono text-zinc-400 backdrop-blur-sm">
        Layers follow queue · {pins.length} geo pin{pins.length === 1 ? "" : "s"}
      </div>
    ) : null;

  return (
    <div className="relative h-[min(52vh,560px)] min-h-[320px] w-full">
      <div ref={containerRef} className="absolute inset-0 min-h-[280px]" />
      {gisHud}
      {pins.length > 0 ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg border border-white/10 bg-black/55 px-2.5 py-1.5 text-[10px] font-mono text-zinc-300 backdrop-blur-sm">
          {pins.length} incident pin{pins.length === 1 ? "" : "s"}
        </div>
      ) : null}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
