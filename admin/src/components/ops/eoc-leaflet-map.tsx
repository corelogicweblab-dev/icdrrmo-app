"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { opsApiErrorUserMessage, opsFetchJson, OpsApiError } from "@/lib/ops-api";
import { ISABELA_EOC_ADDRESS } from "@/lib/isabela-eoc";
import { useWindyLeafletLayer } from "@/hooks/use-windy-leaflet-layer";
import { WINDY_STYLE_BASEMAP_ATTRIBUTION, WINDY_STYLE_BASEMAP_URL } from "@/lib/windy-leaflet";

type OpsLive = {
  eoc: { label: string; latitude: number; longitude: number };
  hazardBarangayPins: Array<{
    code: string;
    name: string;
    hazardKind: "flood" | "landslide";
    latitude: number;
    longitude: number;
  }>;
  incidents: Array<{
    id: string;
    title?: string | null;
    latitude: unknown;
    longitude: unknown;
    status: string;
  }>;
  responders: Array<{
    id: string;
    locations: Array<{ latitude: unknown; longitude: unknown }>;
    user: { email: string };
  }>;
  vehicles: Array<{
    id: string;
    plateNumber: string;
    fleetStatus?: string;
    latitude?: unknown;
    longitude?: unknown;
  }>;
  evacuationCenters: Array<{
    id: string;
    name: string;
    latitude: unknown;
    longitude: unknown;
    occupancy: number;
    capacity: number | null;
  }>;
};

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type Props = {
  /** JWT for `GET /map/ops-live` (ops console or responder token with map access). */
  accessToken: string | undefined | null;
};

export function EocLeafletMap({ accessToken }: Props): ReactElement {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const routeRef = useRef<import("leaflet").Layer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OpsLive | null>(null);
  const [routeEtaMin, setRouteEtaMin] = useState<number | null>(null);
  const [routeBusy, setRouteBusy] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useWindyLeafletLayer({
    mapRef,
    mapReady,
    accessToken,
    overlay: "rain",
    opacity: 0.5,
  });

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const j = await opsFetchJson<OpsLive>("/map/ops-live", accessToken);
        if (!cancelled) setData(j);
        setError(null);
      } catch (e: unknown) {
        if (!cancelled) {
          const msg =
            e instanceof OpsApiError
              ? opsApiErrorUserMessage(e)
              : e instanceof Error
                ? e.message
                : "Failed to load map context";
          setError(msg);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!mapEl.current || !data) return;
    let destroyed = false;
    (async () => {
      const L = await import("leaflet");
      if (destroyed || !mapEl.current) return;
      const center: LatLngExpression = [data.eoc.latitude, data.eoc.longitude];
      if (!mapRef.current) {
        mapRef.current = L.map(mapEl.current, { zoomControl: true }).setView(center, 13);
        L.tileLayer(WINDY_STYLE_BASEMAP_URL, {
          attribution: WINDY_STYLE_BASEMAP_ATTRIBUTION,
          maxZoom: 19,
        }).addTo(mapRef.current);
        layerRef.current = L.layerGroup().addTo(mapRef.current);
        setMapReady(true);
      }
      const map = mapRef.current;
      const layer = layerRef.current;
      if (!map || !layer) return;
      layer.clearLayers();
      if (routeRef.current) {
        map.removeLayer(routeRef.current);
        routeRef.current = null;
      }
      setRouteEtaMin(null);
      const iconEoc = L.divIcon({
        className: "eoc-marker",
        html: `<div style="width:14px;height:14px;border-radius:9999px;background:#f43f5e;border:2px solid #fff;box-shadow:0 0 12px rgba(244,63,94,.7)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker(center, { icon: iconEoc }).addTo(layer).bindPopup(`<b>${data.eoc.label}</b>`);
      const hz = data.hazardBarangayPins ?? [];
      for (const h of hz) {
        L.circleMarker([h.latitude, h.longitude], {
          radius: 6,
          color: "#7f1d1d",
          weight: 2,
          fillColor: "#dc2626",
          fillOpacity: 0.9,
        })
          .addTo(layer)
          .bindPopup(
            `<b>${h.name}</b><br/><span style="opacity:.85;font-size:11px">${h.code} · ${h.hazardKind === "flood" ? "Flood ref." : "Landslide ref."}</span>`,
          );
      }
      for (const inc of data.incidents) {
        const la = num(inc.latitude);
        const lo = num(inc.longitude);
        if (la == null || lo == null) continue;
        L.circleMarker([la, lo], { radius: 7, color: "#fb7185", weight: 2, fillOpacity: 0.35 })
          .addTo(layer)
          .bindPopup(`<b>Incident</b><br/>${inc.title ?? inc.id}<br/><span style="opacity:.8">${inc.status}</span>`);
      }
      for (const r of data.responders) {
        const loc = r.locations[0];
        if (!loc) continue;
        const la = num(loc.latitude);
        const lo = num(loc.longitude);
        if (la == null || lo == null) continue;
        L.circleMarker([la, lo], { radius: 6, color: "#38bdf8", weight: 2, fillOpacity: 0.4 })
          .addTo(layer)
          .bindPopup(`<b>Responder</b><br/>${r.user.email}`);
      }
      for (const v of data.vehicles) {
        const la = num(v.latitude);
        const lo = num(v.longitude);
        if (la == null || lo == null) continue;
        L.circleMarker([la, lo], { radius: 5, color: "#4ade80", weight: 2, fillOpacity: 0.45 })
          .addTo(layer)
          .bindPopup(`<b>Vehicle</b><br/>${v.plateNumber}<br/><span style="opacity:.8">${v.fleetStatus ?? ""}</span>`);
      }
      for (const e of data.evacuationCenters) {
        const la = num(e.latitude);
        const lo = num(e.longitude);
        if (la == null || lo == null) continue;
        L.marker([la, lo])
          .addTo(layer)
          .bindPopup(
            `<b>${e.name}</b><br/>Occupancy ${e.occupancy}${e.capacity != null ? ` / ${e.capacity}` : ""}`,
          );
      }
    })();
    return () => {
      destroyed = true;
    };
  }, [data]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      routeRef.current = null;
    };
  }, []);

  const drawRouteToIncident = useCallback(async () => {
    if (!data || !accessToken || !mapRef.current) return;
    const target = data.incidents.find((i) => {
      const la = num(i.latitude);
      const lo = num(i.longitude);
      return la != null && lo != null;
    });
    if (!target) {
      setError("No incident with coordinates to route to.");
      return;
    }
    const tLat = num(target.latitude);
    const tLon = num(target.longitude);
    if (tLat == null || tLon == null) return;
    setRouteBusy(true);
    setError(null);
    try {
      const lo0 = data.eoc.longitude;
      const la0 = data.eoc.latitude;
      const url = `https://router.project-osrm.org/route/v1/driving/${lo0},${la0};${tLon},${tLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const j = (await res.json()) as {
        routes?: Array<{ duration: number; geometry: { coordinates: [number, number][] } }>;
        code?: string;
      };
      const route = j.routes?.[0];
      if (!route?.geometry?.coordinates?.length) {
        setError("Routing service returned no path.");
        setRouteBusy(false);
        return;
      }
      const L = await import("leaflet");
      const map = mapRef.current;
      if (routeRef.current) {
        map.removeLayer(routeRef.current);
        routeRef.current = null;
      }
      const latLngs: LatLngExpression[] = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      const line = L.polyline(latLngs, { color: "#fbbf24", weight: 4, opacity: 0.92 }).addTo(map);
      routeRef.current = line;
      line.bindPopup(`<b>ETA</b> ${Math.max(1, Math.round(route.duration / 60))} min (driving)`).openPopup();
      map.fitBounds(line.getBounds(), { padding: [36, 36] });
      setRouteEtaMin(Math.max(1, Math.round(route.duration / 60)));
    } catch {
      setError("Could not fetch route from OSRM.");
    } finally {
      setRouteBusy(false);
    }
  }, [data, accessToken]);

  if (!accessToken) {
    return <p className="text-xs text-zinc-500">Sign in to load the Leaflet EOC map.</p>;
  }
  if (error && !data) {
    return <p className="text-xs text-rose-300">{error}</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={routeBusy || !data}
          onClick={() => void drawRouteToIncident()}
          className="rounded-lg border border-amber-500/35 bg-amber-950/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-100 hover:bg-amber-900/35 disabled:opacity-40 transition-colors"
        >
          {routeBusy ? "Routing…" : "Route + ETA to first incident"}
        </button>
        {routeEtaMin != null ? (
          <span className="text-[11px] text-amber-200/90 tabular-nums">~{routeEtaMin} min</span>
        ) : null}
      </div>
      {error && data ? <p className="text-[10px] text-rose-300/90">{error}</p> : null}
      <div ref={mapEl} className="h-[420px] w-full overflow-hidden rounded-xl border border-orange-500/15 bg-black/40" />
      <p className="text-[10px] text-zinc-500">
        Leaflet + Esri World Street (English labels) · EOC: {ISABELA_EOC_ADDRESS} · Live incident and asset layers load
        from the emergency services server. ETA uses a public routing service; your administrator may configure a
        private router for production.
      </p>
    </div>
  );
}
