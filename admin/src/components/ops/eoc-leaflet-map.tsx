"use client";

import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { opsFetchJson } from "@/lib/ops-api";

type OpsLive = {
  eoc: { label: string; latitude: number; longitude: number };
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
  vehicles: Array<{ id: string; plateNumber: string; fleetStatus?: string }>;
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

export function EocLeafletMap(): ReactElement {
  const { tokens } = useOpsSession();
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OpsLive | null>(null);

  useEffect(() => {
    if (!tokens?.accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const j = await opsFetchJson<OpsLive>("/map/ops-live", tokens.accessToken);
        if (!cancelled) setData(j);
        setError(null);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load map context");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokens?.accessToken]);

  useEffect(() => {
    if (!mapEl.current || !data) return;
    let destroyed = false;
    (async () => {
      const L = await import("leaflet");
      if (destroyed || !mapEl.current) return;
      const center: LatLngExpression = [data.eoc.latitude, data.eoc.longitude];
      if (!mapRef.current) {
        mapRef.current = L.map(mapEl.current, { zoomControl: true }).setView(center, 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
          maxZoom: 19,
        }).addTo(mapRef.current);
        layerRef.current = L.layerGroup().addTo(mapRef.current);
      }
      const map = mapRef.current;
      const layer = layerRef.current;
      if (!map || !layer) return;
      layer.clearLayers();
      const iconEoc = L.divIcon({
        className: "eoc-marker",
        html: `<div style="width:14px;height:14px;border-radius:9999px;background:#f43f5e;border:2px solid #fff;box-shadow:0 0 12px rgba(244,63,94,.7)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker(center, { icon: iconEoc }).addTo(layer).bindPopup(`<b>${data.eoc.label}</b>`);
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
        /* vehicles without live GPS — skip until telemetry endpoint exists */
        void v;
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
    };
  }, []);

  if (!tokens?.accessToken) {
    return <p className="text-xs text-zinc-500">Sign in to load the Leaflet EOC map.</p>;
  }
  if (error) {
    return <p className="text-xs text-rose-300">{error}</p>;
  }

  return (
    <div className="space-y-2">
      <div ref={mapEl} className="h-[420px] w-full overflow-hidden rounded-xl border border-white/[0.08] bg-black/40" />
      <p className="text-[10px] text-zinc-500">
        Leaflet + OSM tiles · EOC reference marker · incidents, last-known responder positions, evacuation sites from{" "}
        <code className="text-zinc-400">GET /api/v1/map/ops-live</code>.
      </p>
    </div>
  );
}
