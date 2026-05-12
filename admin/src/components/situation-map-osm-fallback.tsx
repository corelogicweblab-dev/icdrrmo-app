"use client";

import type { ReactElement } from "react";
import { useEffect, useRef } from "react";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";
import type { MapIncidentPin } from "@/lib/map-pins";
import { markerColorForIncidentType } from "@/lib/map-pins";
import { hazardPinsForLayers } from "@/lib/isabela-hazard-barangay-locations";
import { ISABELA_EOC_ADDRESS, ISABELA_EOC_LAT, ISABELA_EOC_LNG } from "@/lib/isabela-eoc";

export type SituationMapOsmFallbackProps = {
  pins: MapIncidentPin[];
  showMarkers: boolean;
  /** When set (GIS page), flood / landslide reference dots follow layer checkboxes. When omitted, show all hazard pins. */
  layerToggles?: Record<string, boolean>;
};

/**
 * OpenStreetMap basemap when `NEXT_PUBLIC_MAPBOX_TOKEN` is unset — same AOI and incident pins as Mapbox build.
 */
export function SituationMapOsmFallback(props: SituationMapOsmFallbackProps): ReactElement {
  const { pins, showMarkers, layerToggles } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const resizeObsRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let alive = true;

    void (async () => {
      const L = await import("leaflet");
      if (!alive || !containerRef.current) return;

      const center: LatLngExpression = [ISABELA_EOC_LAT, ISABELA_EOC_LNG];

      if (!mapRef.current) {
        mapRef.current = L.map(el, { zoomControl: true }).setView(center, 12.2);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
          maxZoom: 19,
        }).addTo(mapRef.current);
        layerRef.current = L.layerGroup().addTo(mapRef.current);
        const ro = new ResizeObserver(() => {
          mapRef.current?.invalidateSize();
        });
        ro.observe(el);
        resizeObsRef.current = ro;
        requestAnimationFrame(() => mapRef.current?.invalidateSize());
      }

      const map = mapRef.current;
      const layer = layerRef.current;
      if (!alive || !map || !layer) return;

      layer.clearLayers();

      const eocIcon = L.divIcon({
        className: "eoc-marker-osm",
        html: `<div style="width:16px;height:16px;border-radius:9999px;background:#e11d48;border:2px solid #fff;box-shadow:0 0 14px rgba(225,29,72,.75)"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker(center, { icon: eocIcon })
        .addTo(layer)
        .bindPopup(`<div style="font-size:12px"><strong>${escapeHtml(ISABELA_EOC_ADDRESS)}</strong></div>`);

      if (showMarkers) {
        for (const p of pins) {
          const color = markerColorForIncidentType(p.type);
          L.circleMarker([p.lat, p.lng], {
            radius: 8,
            color,
            weight: 2,
            fillOpacity: 0.38,
          })
            .addTo(layer)
            .bindPopup(
              `<div style="font-size:12px"><strong>${escapeHtml(p.label)}</strong><br/><span style="opacity:.75;font-size:10px">${escapeHtml(p.id)}</span></div>`,
            );
        }
      }

      const hazardPins = hazardPinsForLayers(layerToggles);
      for (const h of hazardPins) {
        L.circleMarker([h.latitude, h.longitude], {
          radius: 6,
          color: "#7f1d1d",
          weight: 2,
          fillColor: "#dc2626",
          fillOpacity: 0.92,
        })
          .addTo(layer)
          .bindPopup(
            `<div style="font-size:12px"><strong style="color:#450a0a">${escapeHtml(h.name)}</strong><br/>` +
              `<span style="font-size:10px">${escapeHtml(h.code)} · ${h.hazardKind === "flood" ? "Flood reference" : "Landslide reference"}</span></div>`,
          );
      }

      if (!alive) return;
const allPoints: [number, number][] = [[ISABELA_EOC_LAT, ISABELA_EOC_LNG]];
      allPoints.push(...hazardPins.map((h) => [h.latitude, h.longitude] as [number, number]));
      if (pins.length > 0 && showMarkers) {
        pins.forEach((p) => allPoints.push([p.lat, p.lng]));
      }
      if (allPoints.length > 0) {
        const b = L.latLngBounds(allPoints);
        map.fitBounds(b, { padding: [48, 48], maxZoom: 14 });
      } else {
        map.setView(center, 12.2);
      }
    })();

    return () => {
      alive = false;
    };
  }, [pins, showMarkers, layerToggles]);

  useEffect(() => {
    return () => {
      resizeObsRef.current?.disconnect();
      resizeObsRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  return (
    <div className="relative flex h-full min-h-[min(52vh,560px)] min-h-[320px] w-full flex-1 flex-col">
      <div ref={containerRef} className="absolute inset-0 min-h-[280px] z-0" />
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-[500] flex flex-wrap items-end justify-between gap-2">
        <div className="max-w-[min(100%,420px)] rounded-lg border border-white/10 bg-black/70 px-2.5 py-2 text-[10px] leading-snug text-zinc-200 backdrop-blur-sm">
          <span className="font-semibold text-rose-300/95">EOC</span>
          <p className="mt-0.5 text-zinc-300">{ISABELA_EOC_ADDRESS}</p>
          <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-[10px] text-zinc-500">
            <MapPin className="h-3 w-3 shrink-0 text-rose-400/80" aria-hidden />
            {ISABELA_EOC_LAT.toFixed(5)}°N · {ISABELA_EOC_LNG.toFixed(5)}°E
          </p>
          <p className="mt-1.5 text-[9px] text-zinc-500">
            Red dots: flood / landslide barangay reference (OSM-based centroids — validate with LGU / MGB).
          </p>
        </div>
        <div className="rounded-lg border border-amber-500/25 bg-amber-950/40 px-2 py-1.5 text-[9px] text-amber-100/90 backdrop-blur-sm">
          OSM fallback — Mapbox token enables clusters / heatmap
        </div>
      </div>
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
