"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation } from "lucide-react";
import { OPS_LEAFLET_ATTRIBUTION, OPS_LEAFLET_TILE_URL } from "@/lib/ops-leaflet-basemap";

type Props = {
  incidentLat: number;
  incidentLon: number;
  label?: string;
};

export function ChairmanLeafletMap(props: Props): ReactElement {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").LayerGroup | null>(null);
  const routeRef = useRef<import("leaflet").Layer | null>(null);
  const [routeEtaMin, setRouteEtaMin] = useState<number | null>(null);
  const [routeBusy, setRouteBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !mapEl.current || mapRef.current) return;
      const center: LatLngExpression = [props.incidentLat, props.incidentLon];
      const map = L.map(mapEl.current, { zoomControl: true }).setView(center, 15);
      L.tileLayer(OPS_LEAFLET_TILE_URL, { attribution: OPS_LEAFLET_ATTRIBUTION }).addTo(map);
      const markers = L.layerGroup().addTo(map);
      markersRef.current = markers;
      L.circleMarker(center, {
        radius: 10,
        color: "#f43f5e",
        fillColor: "#e11d48",
        fillOpacity: 0.9,
        weight: 2,
      })
        .bindPopup(props.label ?? "Incident")
        .addTo(markers);
      mapRef.current = map;
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [props.incidentLat, props.incidentLon, props.label]);

  const drawRoute = useCallback(async () => {
    if (!mapRef.current) return;
    setRouteBusy(true);
    setGeoError(null);
    setRouteEtaMin(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12_000,
        });
      });
      const fromLat = pos.coords.latitude;
      const fromLon = pos.coords.longitude;
      const url =
        `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${props.incidentLon},${props.incidentLat}` +
        "?overview=full&geometries=geojson";
      const res = await fetch(url);
      const json = (await res.json()) as {
        routes?: Array<{ duration?: number; geometry?: { coordinates: [number, number][] } }>;
      };
      const route = json.routes?.[0];
      if (!route?.geometry?.coordinates?.length) {
        setGeoError("Could not compute route.");
        return;
      }
      const L = await import("leaflet");
      if (routeRef.current) {
        mapRef.current.removeLayer(routeRef.current);
      }
      const latlngs = route.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);
      const line = L.polyline(latlngs, { color: "#38bdf8", weight: 5, opacity: 0.85 }).addTo(mapRef.current);
      routeRef.current = line;
      L.circleMarker([fromLat, fromLon], {
        radius: 8,
        color: "#38bdf8",
        fillColor: "#0ea5e9",
        fillOpacity: 0.9,
      })
        .bindPopup("Your location")
        .addTo(mapRef.current);
      mapRef.current.fitBounds(line.getBounds(), { padding: [40, 40] });
      setRouteEtaMin(Math.round((route.duration ?? 0) / 60));
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLon}&destination=${props.incidentLat},${props.incidentLon}&travelmode=driving`;
      window.open(mapsUrl, "_blank", "noopener,noreferrer");
    } catch {
      setGeoError("Enable location access to show directions from your position.");
    } finally {
      setRouteBusy(false);
    }
  }, [props.incidentLat, props.incidentLon]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void drawRoute()}
          disabled={routeBusy}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
        >
          <Navigation className="h-3.5 w-3.5" aria-hidden />
          {routeBusy ? "Routing…" : "Directions to incident"}
        </button>
        {routeEtaMin != null ? (
          <span className="text-xs text-sky-300">~{routeEtaMin} min drive (estimate)</span>
        ) : null}
      </div>
      {geoError ? <p className="text-xs text-amber-300">{geoError}</p> : null}
      <div ref={mapEl} className="h-[min(52vh,420px)] w-full rounded-xl border border-white/10 overflow-hidden" />
    </div>
  );
}
