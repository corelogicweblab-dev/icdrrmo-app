"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Cloud, CloudRain, Home, LocateFixed, Thermometer, Wind } from "lucide-react";
import { opsFetchJson } from "@/lib/ops-api";
import { fetchEocWeather, type EocWeatherBundle } from "@/lib/eoc-weather";
import {
  connectEocRealtime,
  type EvacuationCenterWsPayload,
} from "@/lib/eoc-realtime";
import { ISABELA_EOC_LAT, ISABELA_EOC_LNG } from "@/lib/isabela-eoc";
import { OPS_LEAFLET_ATTRIBUTION, OPS_LEAFLET_TILE_URL } from "@/lib/ops-leaflet-basemap";

export type EocMapMode = "ops" | "citizen" | "responder" | "chairman";

type EvacMarker = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  occupancy: number;
  capacity: number | null;
  barangayName?: string | null;
};

type IncidentPin = {
  id: string;
  title?: string | null;
  latitude: number;
  longitude: number;
  status: string;
};

type OpsLive = {
  eoc: { latitude: number; longitude: number };
  hazardBarangayPins: Array<{
    name: string;
    hazardKind: string;
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
    locations: Array<{ latitude: unknown; longitude: unknown }>;
    user: { email: string };
  }>;
  vehicles: Array<{
    plateNumber: string;
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
  mode: EocMapMode;
  accessToken: string | null | undefined;
  className?: string;
  mapHeight?: string;
};

const LAYER_ICONS: Record<string, typeof CloudRain> = {
  precipitation: CloudRain,
  clouds: Cloud,
  temp: Thermometer,
  wind: Wind,
};

export function EocUnifiedMap({
  mode,
  accessToken,
  className = "",
  mapHeight = "min-h-[480px] h-[55vh] lg:h-[calc(100vh-220px)]",
}: Props): ReactElement {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").LayerGroup | null>(null);
  const weatherLayersRef = useRef<Record<string, import("leaflet").TileLayer>>({});
  const pagasaLayerRef = useRef<import("leaflet").LayerGroup | null>(null);

  const [weather, setWeather] = useState<EocWeatherBundle | null>(null);
  const [activeWeatherLayer, setActiveWeatherLayer] = useState<string | null>(null);
  const [evac, setEvac] = useState<EvacMarker[]>([]);
  const [incidents, setIncidents] = useState<IncidentPin[]>([]);
  const [hazards, setHazards] = useState<OpsLive["hazardBarangayPins"]>([]);
  const [responders, setResponders] = useState<
    Array<{ email: string; latitude: number; longitude: number }>
  >([]);
  const [vehicles, setVehicles] = useState<
    Array<{ plate: string; latitude: number; longitude: number }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [liveToast, setLiveToast] = useState<string | null>(null);

  const showResponders = mode === "ops" || mode === "responder";
  const showAllIncidents = mode === "ops" || mode === "responder" || mode === "chairman";
  const showVehicles = mode === "ops";

  const loadData = useCallback(async () => {
    const token = accessToken;
    if (!token) return;
    setError(null);
    try {
      const [wx, live] = await Promise.all([
        fetchEocWeather(token),
        mode === "citizen"
          ? Promise.resolve(null)
          : opsFetchJson<OpsLive>("/map/ops-live", token).catch(() => null),
      ]);

      setWeather(wx);

      if (mode === "citizen") {
        type EvacRow = {
          id: string;
          name: string;
          latitude: unknown;
          longitude: unknown;
          occupancy: number;
          capacity: number | null;
          barangay?: { name: string } | null;
        };
        const rows = await opsFetchJson<EvacRow[]>("/evacuation-centers/nearest", token);
        setEvac(
          rows
            .map((r) => ({
              id: r.id,
              name: r.name,
              latitude: num(r.latitude) ?? 0,
              longitude: num(r.longitude) ?? 0,
              occupancy: r.occupancy,
              capacity: r.capacity,
              barangayName: r.barangay?.name ?? null,
            }))
            .filter((r) => r.latitude && r.longitude),
        );
        setIncidents([]);
        setHazards([]);
      } else if (live) {
        setEvac(
          live.evacuationCenters
            .map((e) => ({
              id: e.id,
              name: e.name,
              latitude: num(e.latitude) ?? 0,
              longitude: num(e.longitude) ?? 0,
              occupancy: e.occupancy,
              capacity: e.capacity,
            }))
            .filter((e) => e.latitude && e.longitude),
        );
        if (showAllIncidents) {
          setIncidents(
            live.incidents
              .map((i) => ({
                id: i.id,
                title: i.title,
                latitude: num(i.latitude) ?? 0,
                longitude: num(i.longitude) ?? 0,
                status: i.status,
              }))
              .filter((i) => i.latitude && i.longitude),
          );
        }
        setHazards(mode === "chairman" || mode === "ops" ? live.hazardBarangayPins : []);
        if (showResponders) {
          setResponders(
            live.responders
              .map((r) => {
                const loc = r.locations[0];
                const lat = num(loc?.latitude);
                const lng = num(loc?.longitude);
                if (lat == null || lng == null) return null;
                return { email: r.user.email, latitude: lat, longitude: lng };
              })
              .filter((x): x is { email: string; latitude: number; longitude: number } => Boolean(x)),
          );
        }
        if (showVehicles) {
          setVehicles(
            live.vehicles
              .map((v) => {
                const lat = num(v.latitude);
                const lng = num(v.longitude);
                if (lat == null || lng == null) return null;
                return { plate: v.plateNumber, latitude: lat, longitude: lng };
              })
              .filter((x): x is { plate: string; latitude: number; longitude: number } => Boolean(x)),
          );
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load EOC map data");
    }
  }, [accessToken, mode, showAllIncidents, showResponders, showVehicles]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const token = accessToken;
    if (!token) return;
    const socket = connectEocRealtime(token, {
      onEvacuationAdded: (p: EvacuationCenterWsPayload) => {
        setEvac((prev) => {
          if (prev.some((x) => x.id === p.id)) return prev;
          return [
            ...prev,
            {
              id: p.id,
              name: p.name,
              latitude: p.latitude,
              longitude: p.longitude,
              occupancy: p.occupancy,
              capacity: p.capacity,
              barangayName: p.barangayName,
            },
          ];
        });
        setLiveToast(`New evacuation center: ${p.name}`);
        window.setTimeout(() => setLiveToast(null), 6000);
      },
      onEvacuationUpdated: (p) => {
        setEvac((prev) =>
          prev.map((x) =>
            x.id === p.id
              ? {
                  ...x,
                  name: p.name,
                  occupancy: p.occupancy,
                  capacity: p.capacity,
                  latitude: p.latitude,
                  longitude: p.longitude,
                }
              : x,
          ),
        );
      },
      onIncidentCreated:
        showAllIncidents
          ? (p) => {
              const lat = p.latitude != null ? Number(p.latitude) : NaN;
              const lng = p.longitude != null ? Number(p.longitude) : NaN;
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
              setIncidents((prev) => {
                if (prev.some((i) => i.id === p.incidentId)) return prev;
                return [
                  {
                    id: p.incidentId,
                    title: p.title ?? null,
                    latitude: lat,
                    longitude: lng,
                    status: "OPEN",
                  },
                  ...prev,
                ];
              });
            }
          : undefined,
    });
    return () => {
      socket.removeAllListeners();
      socket.close();
    };
  }, [accessToken, showAllIncidents]);

  useEffect(() => {
    if (!mapEl.current) return;
    let destroyed = false;
    (async () => {
      const L = await import("leaflet");
      if (destroyed || !mapEl.current) return;
      if (!mapRef.current) {
        const center: LatLngExpression = [ISABELA_EOC_LAT, ISABELA_EOC_LNG];
        const map = L.map(mapEl.current, { zoomControl: true }).setView(center, 12);
        L.tileLayer(OPS_LEAFLET_TILE_URL, {
          attribution: OPS_LEAFLET_ATTRIBUTION,
          maxZoom: 19,
        }).addTo(map);
        markersRef.current = L.layerGroup().addTo(map);
        pagasaLayerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
      }
    })();
    return () => {
      destroyed = true;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;
    void (async () => {
      const L = await import("leaflet");
      const g = markersRef.current!;
      g.clearLayers();

      const eocIcon = L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#f97316;border:2px solid #fff;box-shadow:0 0 8px #f97316"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker([ISABELA_EOC_LAT, ISABELA_EOC_LNG], { icon: eocIcon })
        .bindPopup("<b>ICDRRMO EOC</b>")
        .addTo(g);

      for (const e of evac) {
        const cap = e.capacity ? ` · ${e.occupancy}/${e.capacity}` : "";
        L.circleMarker([e.latitude, e.longitude], {
          radius: 9,
          color: "#a855f7",
          fillColor: "#7c3aed",
          fillOpacity: 0.85,
          weight: 2,
        })
          .bindPopup(`<b>${e.name}</b>${cap}<br/>${e.barangayName ?? ""}`)
          .addTo(g);
      }

      if (showAllIncidents) {
        for (const i of incidents) {
          L.circleMarker([i.latitude, i.longitude], {
            radius: 8,
            color: "#f43f5e",
            fillColor: "#e11d48",
            fillOpacity: 0.9,
            weight: 2,
          })
            .bindPopup(`<b>${i.title ?? "Incident"}</b><br/>${i.status}`)
            .addTo(g);
        }
      }

      for (const h of hazards) {
        L.circleMarker([h.latitude, h.longitude], {
          radius: 6,
          color: h.hazardKind === "flood" ? "#06b6d4" : "#ea580c",
          fillOpacity: 0.5,
          weight: 1,
        })
          .bindPopup(`${h.name} · ${h.hazardKind}`)
          .addTo(g);
      }

      if (showResponders) {
        for (const r of responders) {
          L.circleMarker([r.latitude, r.longitude], {
            radius: 7,
            color: "#22c55e",
            fillColor: "#16a34a",
            fillOpacity: 0.85,
            weight: 2,
          })
            .bindPopup(`Responder · ${r.email}`)
            .addTo(g);
        }
      }

      if (showVehicles) {
        for (const v of vehicles) {
          L.circleMarker([v.latitude, v.longitude], {
            radius: 7,
            color: "#fb923c",
            fillColor: "#ea580c",
            fillOpacity: 0.8,
            weight: 2,
          })
            .bindPopup(`Vehicle · ${v.plate}`)
            .addTo(g);
        }
      }
    })();
  }, [evac, incidents, hazards, responders, vehicles, showAllIncidents, showResponders, showVehicles]);

  useEffect(() => {
    if (!mapRef.current || !weather) return;
    void (async () => {
      const L = await import("leaflet");
      const map = mapRef.current!;

      for (const id of Object.keys(weatherLayersRef.current)) {
        if (activeWeatherLayer !== id) {
          map.removeLayer(weatherLayersRef.current[id]);
        }
      }

      if (!activeWeatherLayer || !weather.openWeather.configured) return;
      const layer = weather.openWeather.layers.find((l) => l.id === activeWeatherLayer);
      if (!layer) return;

      let tile = weatherLayersRef.current[activeWeatherLayer];
      if (!tile) {
        tile = L.tileLayer(layer.urlTemplate, { opacity: 0.65, maxZoom: 19 });
        weatherLayersRef.current[activeWeatherLayer] = tile;
      }
      if (!map.hasLayer(tile)) {
        tile.addTo(map);
      }
    })();
  }, [activeWeatherLayer, weather]);

  useEffect(() => {
    if (!pagasaLayerRef.current || !weather?.pagasa.items.length) return;
    void (async () => {
      const L = await import("leaflet");
      const g = pagasaLayerRef.current!;
      g.clearLayers();
      weather.pagasa.items.slice(0, 8).forEach((item, idx) => {
        const offset = idx * 0.008;
        L.marker([ISABELA_EOC_LAT + offset, ISABELA_EOC_LNG + offset * 0.5], {
          icon: L.divIcon({
            className: "",
            html: `<div style="font-size:9px;padding:2px 4px;background:#0c4a6e;color:#7dd3fc;border:1px solid #38bdf8;border-radius:4px">PAGASA</div>`,
            iconAnchor: [20, 10],
          }),
        })
          .bindPopup(`<b>${item.title}</b><br/>${item.summary}`)
          .addTo(g);
      });
    })();
  }, [weather]);

  return (
    <div className={`flex flex-col lg:flex-row gap-3 ${className}`}>
      <aside className="lg:w-80 shrink-0 space-y-3 max-h-[40vh] lg:max-h-none overflow-y-auto scroll-ops">
        {liveToast ? (
          <p className="text-xs text-emerald-300 animate-pulse border border-emerald-500/30 rounded-lg px-3 py-2 bg-emerald-950/30">
            {liveToast}
          </p>
        ) : null}
        {error ? <p className="text-xs text-rose-300">{error}</p> : null}

        <div className="rounded-xl border border-orange-500/20 bg-black/50 p-3">
          <p className="text-[10px] uppercase tracking-widest text-orange-400/80 mb-2">Weather layers</p>
          {!weather?.openWeather.configured ? (
            <p className="text-[11px] text-zinc-500">
              Set <code className="text-zinc-400">OPENWEATHERMAP_API_KEY</code> on the API for rain/wind/temp/cloud tiles.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {weather.openWeather.layers.map((l) => {
                const Icon = LAYER_ICONS[l.id] ?? Cloud;
                const on = activeWeatherLayer === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setActiveWeatherLayer(on ? null : l.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition ${
                      on
                        ? "border-orange-400 bg-orange-950/50 text-orange-100"
                        : "border-orange-500/15 bg-zinc-900/60 text-zinc-400 hover:border-orange-500/30"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {l.label}
                  </button>
                );
              })}
            </div>
          )}
          {weather?.situation ? (
            <p className="mt-2 text-[11px] text-orange-200/90">
              {weather.situation.current.weatherLabel}
              {weather.situation.current.temperatureC != null
                ? ` · ${weather.situation.current.temperatureC}°C`
                : ""}
              <br />
              <span className="text-zinc-500">{weather.situation.rainOutlook6h.headline}</span>
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-sky-500/25 bg-sky-950/20 p-3">
          <p className="text-[10px] uppercase tracking-widest text-sky-300/90 mb-2 flex items-center gap-1">
            <CloudRain className="h-3.5 w-3.5" aria-hidden />
            PAGASA advisories
          </p>
          {weather?.pagasa.upstreamError ? (
            <p className="text-[11px] text-amber-200/80">{weather.pagasa.upstreamError}</p>
          ) : null}
          <ul className="space-y-2 max-h-[200px] overflow-y-auto scroll-ops text-[11px] text-zinc-300">
            {(weather?.pagasa.items ?? []).map((a) => (
              <li key={a.id} className="border-b border-sky-500/10 pb-2">
                <p className="font-medium text-sky-100/90">{a.title}</p>
                <p className="text-zinc-500 mt-0.5 line-clamp-2">{a.summary}</p>
                {a.link ? (
                  <a
                    href={a.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:underline text-[10px]"
                  >
                    Read on PAGASA →
                  </a>
                ) : null}
              </li>
            ))}
            {!weather?.pagasa.items.length ? (
              <li className="text-zinc-600">No advisories loaded.</li>
            ) : null}
          </ul>
        </div>

        <div className="rounded-xl border border-violet-500/20 bg-black/40 p-3 text-[11px] text-zinc-400">
          <p className="flex items-center gap-1 text-violet-300/90 mb-1">
            <Home className="h-3.5 w-3.5" aria-hidden />
            Shelters · {evac.length} active
          </p>
          <p className="flex items-center gap-1">
            <LocateFixed className="h-3.5 w-3.5 text-rose-400" aria-hidden />
            {mode === "citizen" ? "Nearest to your barangay" : "Live + WebSocket updates"}
          </p>
        </div>
      </aside>

      <div
        className={`flex-1 rounded-2xl border border-orange-500/20 overflow-hidden icd-surface ${mapHeight}`}
      >
        <div ref={mapEl} className="h-full w-full min-h-[320px]" />
      </div>
    </div>
  );
}
