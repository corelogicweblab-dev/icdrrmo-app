"use client";

import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import { ISABELA_EOC_ADDRESS, ISABELA_EOC_LAT, ISABELA_EOC_LNG } from "@/lib/isabela-eoc";
import { OPS_LEAFLET_ATTRIBUTION, OPS_LEAFLET_TILE_URL } from "@/lib/ops-leaflet-basemap";
import "leaflet/dist/leaflet.css";

export type CitizenSosRouteCardProps = {
  incidentId: string;
  deduplicated: boolean;
  userLat: number;
  userLon: number;
  emergencyLabel: string;
};

export function CitizenSosRouteCard(props: CitizenSosRouteCardProps): ReactElement {
  const [etaMin, setEtaMin] = useState<number | null>(null);
  const [distKm, setDistKm] = useState<number | null>(null);
  const [routeErr, setRouteErr] = useState<string | null>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const overlayRef = useRef<import("leaflet").LayerGroup | null>(null);

  const gmapsUrl = `https://www.google.com/maps/dir/${ISABELA_EOC_LAT},${ISABELA_EOC_LNG}/${props.userLat},${props.userLon}`;
  const wazeUrl = `https://waze.com/ul?ll=${encodeURIComponent(String(props.userLat))},${encodeURIComponent(String(props.userLon))}&navigate=yes`;

  useEffect(() => {
    let cancelled = false;
    const { userLat, userLon } = props;

    (async () => {
      setRouteErr(null);
      setEtaMin(null);
      setDistKm(null);
      const osrm = `https://router.project-osrm.org/route/v1/driving/${ISABELA_EOC_LNG},${ISABELA_EOC_LAT};${userLon},${userLat}?overview=full&geometries=geojson`;
      try {
        const res = await fetch(osrm);
        const j = (await res.json()) as {
          routes?: Array<{ duration: number; distance: number; geometry: { coordinates: [number, number][] } }>;
        };
        if (cancelled) return;
        const route = j.routes?.[0];
        if (!route?.geometry?.coordinates?.length) {
          setRouteErr("No driving route found — try the Maps / Waze links below.");
          return;
        }
        setEtaMin(Math.round(route.duration / 60));
        setDistKm(Math.round((route.distance / 1000) * 10) / 10);

        const L = await import("leaflet");
        if (cancelled || !mapEl.current) return;
        const eoc: [number, number] = [ISABELA_EOC_LAT, ISABELA_EOC_LNG];
        const user: [number, number] = [userLat, userLon];
        const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);

        if (!mapRef.current) {
          mapRef.current = L.map(mapEl.current, { zoomControl: true }).setView(user, 13);
          L.tileLayer(OPS_LEAFLET_TILE_URL, {
            attribution: OPS_LEAFLET_ATTRIBUTION,
            maxZoom: 19,
          }).addTo(mapRef.current);
          overlayRef.current = L.layerGroup().addTo(mapRef.current);
        }
        const map = mapRef.current;
        const overlay = overlayRef.current;
        if (!map || !overlay) return;
        overlay.clearLayers();

        const poly = L.polyline(coords, { color: "#f43f5e", weight: 5, opacity: 0.85 }).addTo(overlay);
        L.marker(eoc, {
          icon: L.divIcon({
            className: "eoc-sos-marker",
            html: `<div style="width:12px;height:12px;border-radius:9999px;background:#f43f5e;border:2px solid #fff"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          }),
        })
          .addTo(overlay)
          .bindPopup("EOC");
        L.marker(user, {
          icon: L.divIcon({
            className: "user-sos-marker",
            html: `<div style="width:12px;height:12px;border-radius:9999px;background:#34d399;border:2px solid #fff"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          }),
        })
          .addTo(overlay)
          .bindPopup("SOS location");
        map.fitBounds(poly.getBounds(), { padding: [24, 24] });
      } catch {
        if (!cancelled) setRouteErr("Could not load directions. Use Maps / Waze below.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [props.userLat, props.userLon]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  const when = new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
  const shortId = props.incidentId.length > 10 ? `${props.incidentId.slice(0, 8)}…` : props.incidentId;

  return (
    <div className="space-y-4 text-left">
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100">
        <p className="font-semibold text-white">{props.emergencyLabel}</p>
        <p className="mt-1 text-xs text-emerald-200/90">
          {props.deduplicated ? "Linked to an existing open report." : "Submitted to the operations center."} Reference:{" "}
          <span className="font-mono text-emerald-100">{shortId}</span>
        </p>
        <p className="mt-1 text-[11px] text-emerald-200/70">{when}</p>
        {etaMin != null ? (
          <p className="mt-2 text-sm text-white">
            Estimated from EOC: ~{etaMin} min drive
            {distKm != null ? ` · ~${distKm} km` : ""}
          </p>
        ) : routeErr ? (
          <p className="mt-2 text-xs text-amber-200/90">{routeErr}</p>
        ) : (
          <p className="mt-2 text-xs text-emerald-200/70">Fetching route…</p>
        )}
      </div>
      <div ref={mapEl} className="h-48 w-full overflow-hidden rounded-xl border border-white/10 bg-black/40" />
      <div className="flex flex-col gap-2 sm:flex-row">
        <a
          href={gmapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-xs font-semibold text-white hover:bg-white/15"
        >
          <MapPin className="h-4 w-4 shrink-0" aria-hidden />
          Google Maps (EOC → you)
          <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
        </a>
        <a
          href={wazeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600/90 px-4 py-3 text-xs font-semibold text-white hover:bg-sky-600"
        >
          Open in Waze
          <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
        </a>
      </div>
      <p className="text-[10px] leading-relaxed text-zinc-500">
        EOC: {ISABELA_EOC_ADDRESS}. Route from public OSRM (may differ from live traffic).
      </p>
    </div>
  );
}
