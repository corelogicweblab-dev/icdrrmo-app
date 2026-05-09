"use client";

import type { ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Layers, MapPin } from "lucide-react";
import type { MapIncidentPin } from "@/lib/map-pins";

/** Isabela City, Basilan — city center (WGS84). */
const ISABELA_CENTER: [number, number] = [121.9715, 6.7042];

function markerColorForType(type: string): string {
  const t = type.toUpperCase();
  if (t.includes("FIRE")) return "#f97316";
  if (t.includes("FLOOD") || t.includes("TYPHOON") || t.includes("LANDSLIDE")) return "#38bdf8";
  if (t.includes("MEDICAL")) return "#34d399";
  if (t.includes("EARTHQUAKE")) return "#fbbf24";
  return "#f43f5e";
}

export function SituationMap(props: { incidentPins?: MapIncidentPin[] }): ReactElement {
  const pins = useMemo(() => props.incidentPins ?? [], [props.incidentPins]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? "";

  useEffect(() => {
    if (!token || !containerRef.current) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: ISABELA_CENTER,
      zoom: 12.2,
      attributionControl: true,
      cooperativeGestures: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    mapRef.current = map;
    const onLoad = (): void => {
      setMapReady(true);
    };
    map.once("load", onLoad);

    const onResize = (): void => {
      map.resize();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      map.off("load", onLoad);
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
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const p of pins) {
      const el = document.createElement("div");
      el.style.width = "14px";
      el.style.height = "14px";
      el.style.borderRadius = "9999px";
      el.style.border = "2px solid rgba(255,255,255,0.95)";
      el.style.background = markerColorForType(p.type);
      el.style.boxShadow = "0 0 10px rgba(0,0,0,0.55)";
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([p.lng, p.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 14, maxWidth: "240px" }).setHTML(
            `<div class="text-xs font-sans text-zinc-800"><strong>${p.label}</strong><br/><span class="font-mono text-[10px] opacity-80">${p.id}</span></div>`,
          ),
        )
        .addTo(map);
      markersRef.current.push(marker);
    }

    if (pins.length > 0) {
      const b = new mapboxgl.LngLatBounds();
      pins.forEach((p) => b.extend([p.lng, p.lat]));
      map.fitBounds(b, { padding: 56, maxZoom: 14.5, duration: 600 });
    } else {
      map.flyTo({ center: ISABELA_CENTER, zoom: 12.2, duration: 400 });
    }
  }, [pins, mapReady, token]);

  if (!token) {
    return (
      <div className="flex-1 relative min-h-[280px] flex flex-col">
        <div className="absolute inset-0 ops-grid-bg opacity-60" aria-hidden />
        <div className="relative flex-1 flex flex-col items-center justify-center p-8 text-center border-t border-white/[0.04] bg-gradient-to-b from-zinc-950/40 to-black/60">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] shadow-panel">
            <Layers className="h-7 w-7 text-zinc-500" strokeWidth={1.25} aria-hidden />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Geospatial layer
          </p>
          <p className="mt-2 max-w-sm text-sm font-medium text-zinc-300">
            Basemap not configured — add Mapbox credentials to activate live mapping and incident markers.
          </p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/8 bg-black/30 px-3 py-2 font-mono text-[11px] text-zinc-500">
            <MapPin className="h-3.5 w-3.5 text-rose-400/80 shrink-0" aria-hidden />
            {ISABELA_CENTER[1].toFixed(4)}°N · {ISABELA_CENTER[0].toFixed(4)}°E
          </p>
          <p className="mt-4 text-xs text-zinc-600 max-w-md leading-relaxed">
            Set <code className="text-zinc-400">NEXT_PUBLIC_MAPBOX_TOKEN</code> in{" "}
            <code className="text-zinc-400">.env.local</code>, then restart the dev server or rebuild
            the admin image.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative min-h-[280px]">
      <div ref={containerRef} className="absolute inset-0" />
      {pins.length > 0 ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg border border-white/10 bg-black/55 px-2.5 py-1.5 text-[10px] font-mono text-zinc-300 backdrop-blur-sm">
          {pins.length} incident pin{pins.length === 1 ? "" : "s"}
        </div>
      ) : null}
    </div>
  );
}
