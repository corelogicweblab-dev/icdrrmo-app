"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LatLngExpression, LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Cloud,
  CloudRain,
  Home,
  Layers,
  LocateFixed,
  MapPin,
  RefreshCw,
  Thermometer,
  Truck,
  Users,
  Wind,
} from "lucide-react";
import { getMapboxToken, hasMapboxToken } from "@/lib/env";
import { opsFetchJson } from "@/lib/ops-api";
import { fetchEocWeather, type EocWeatherBundle } from "@/lib/eoc-weather";
import {
  connectEocRealtime,
  type EvacuationCenterWsPayload,
} from "@/lib/eoc-realtime";
import { ISABELA_EOC_LAT, ISABELA_EOC_LNG } from "@/lib/isabela-eoc";
import { ISABELA_CITY_LAT, ISABELA_CITY_LON } from "@/lib/isabela-forecast-embed";
import { OPS_LEAFLET_ATTRIBUTION, OPS_LEAFLET_TILE_URL } from "@/lib/ops-leaflet-basemap";
import { EOC_MAP_BUILD, fetchRainViewerTileUrl, mapboxDarkTileUrl } from "@/lib/eoc-map-layers";

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

type WeatherLayerId = "rain-radar" | "precipitation" | "clouds" | "temp" | "wind";

type Props = {
  mode: EocMapMode;
  accessToken: string | null | undefined;
  className?: string;
  /** fullscreen = fills ops desk content area */
  layout?: "default" | "fullscreen";
};

const LAYER_META: Record<
  WeatherLayerId,
  { label: string; icon: typeof CloudRain; needsOwm?: boolean }
> = {
  "rain-radar": { label: "Rain radar (live)", icon: CloudRain },
  precipitation: { label: "Rain (OWM)", icon: CloudRain, needsOwm: true },
  clouds: { label: "Clouds", icon: Cloud, needsOwm: true },
  temp: { label: "Temperature", icon: Thermometer, needsOwm: true },
  wind: { label: "Wind", icon: Wind, needsOwm: true },
};

export function EocUnifiedMap({
  mode,
  accessToken,
  className = "",
  layout = "default",
}: Props): ReactElement {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const basemapRef = useRef<import("leaflet").TileLayer | null>(null);
  const markersRef = useRef<import("leaflet").LayerGroup | null>(null);
  const weatherLayersRef = useRef<Partial<Record<WeatherLayerId, import("leaflet").TileLayer>>>({});
  const pagasaLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const rainViewerUrlRef = useRef<string | null>(null);

  const [weather, setWeather] = useState<EocWeatherBundle | null>(null);
  const [activeLayers, setActiveLayers] = useState<Set<WeatherLayerId>>(
    () => new Set<WeatherLayerId>(["rain-radar"]),
  );
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
  const [busy, setBusy] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const showResponders = mode === "ops" || mode === "responder";
  const showAllIncidents = mode === "ops" || mode === "responder" || mode === "chairman";
  const showVehicles = mode === "ops";
  const owmReady = Boolean(weather?.openWeather.configured);

  const loadData = useCallback(async () => {
    const token = accessToken;
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const [wx, live, rainUrl] = await Promise.all([
        fetchEocWeather(token).catch(() => null),
        mode === "citizen"
          ? Promise.resolve(null)
          : opsFetchJson<OpsLive>("/map/ops-live", token).catch(() => null),
        fetchRainViewerTileUrl(),
      ]);
      rainViewerUrlRef.current = rainUrl;
      if (wx) setWeather(wx);

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
      setError(e instanceof Error ? e.message : "Failed to load map data");
    } finally {
      setBusy(false);
    }
  }, [accessToken, mode, showAllIncidents, showResponders, showVehicles]);

  useEffect(() => {
    void loadData();
    const id = window.setInterval(() => void loadData(), 90_000);
    return () => window.clearInterval(id);
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
        setLiveToast(`New shelter: ${p.name}`);
        window.setTimeout(() => setLiveToast(null), 8000);
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
      onIncidentCreated: showAllIncidents
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
      if (destroyed || !mapEl.current || mapRef.current) return;

      const center: LatLngExpression = [ISABELA_CITY_LAT, ISABELA_CITY_LON];
      const map = L.map(mapEl.current, {
        zoomControl: false,
        preferCanvas: true,
      }).setView(center, 11);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      const mbx = getMapboxToken();
      const basemap = hasMapboxToken()
        ? L.tileLayer(mapboxDarkTileUrl(mbx), {
            attribution: "© Mapbox © OpenStreetMap",
            maxZoom: 19,
          })
        : L.tileLayer(OPS_LEAFLET_TILE_URL, {
            attribution: OPS_LEAFLET_ATTRIBUTION,
            maxZoom: 19,
          });
      basemap.addTo(map);
      basemapRef.current = basemap;

      markersRef.current = L.layerGroup().addTo(map);
      pagasaLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      window.setTimeout(() => {
        map.invalidateSize();
        setMapReady(true);
      }, 200);
    })();
    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const fitMapToData = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    void import("leaflet").then((L) => {
      const pts: LatLngExpression[] = [
        [ISABELA_EOC_LAT, ISABELA_EOC_LNG],
        ...evac.map((e) => [e.latitude, e.longitude] as LatLngExpression),
        ...incidents.map((i) => [i.latitude, i.longitude] as LatLngExpression),
      ];
      if (pts.length < 2) {
        map.setView([ISABELA_CITY_LAT, ISABELA_CITY_LON], 11);
        return;
      }
      const bounds = L.latLngBounds(pts);
      map.fitBounds(bounds as LatLngBoundsExpression, { padding: [48, 48], maxZoom: 13 });
    });
  }, [evac, incidents]);

  useEffect(() => {
    if (mapReady) fitMapToData();
  }, [mapReady, fitMapToData]);

  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;
    void (async () => {
      const L = await import("leaflet");
      const g = markersRef.current!;
      g.clearLayers();

      L.marker([ISABELA_EOC_LAT, ISABELA_EOC_LNG], {
        icon: L.divIcon({
          className: "",
          html: `<div style="width:16px;height:16px;border-radius:50%;background:#f97316;border:2px solid #fff;box-shadow:0 0 12px #f97316"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
      })
        .bindPopup("<b>ICDRRMO EOC</b><br/>Isabela City, Basilan")
        .addTo(g);

      for (const e of evac) {
        const cap = e.capacity ? ` · ${e.occupancy}/${e.capacity}` : "";
        L.marker([e.latitude, e.longitude], {
          icon: L.divIcon({
            className: "",
            html: `<div style="background:#5b21b6;color:#ede9fe;font-size:10px;font-weight:700;padding:3px 6px;border-radius:6px;border:1px solid #a78bfa;white-space:nowrap">🏠 ${e.name.slice(0, 18)}</div>`,
            iconAnchor: [0, 20],
          }),
        })
          .bindPopup(`<b>${e.name}</b>${cap}`)
          .addTo(g);
      }

      if (showAllIncidents) {
        for (const i of incidents) {
          L.circleMarker([i.latitude, i.longitude], {
            radius: 10,
            color: "#f43f5e",
            fillColor: "#e11d48",
            fillOpacity: 0.95,
            weight: 2,
          })
            .bindPopup(`<b>${i.title ?? "Incident"}</b><br/>${i.status}`)
            .addTo(g);
        }
      }

      for (const h of hazards) {
        L.circleMarker([h.latitude, h.longitude], {
          radius: 7,
          color: h.hazardKind === "flood" ? "#06b6d4" : "#ea580c",
          fillOpacity: 0.55,
          weight: 2,
        })
          .bindPopup(`${h.name} · ${h.hazardKind}`)
          .addTo(g);
      }

      if (showResponders) {
        for (const r of responders) {
          L.circleMarker([r.latitude, r.longitude], {
            radius: 8,
            color: "#22c55e",
            fillColor: "#16a34a",
            fillOpacity: 0.9,
            weight: 2,
          })
            .bindPopup(`Responder · ${r.email}`)
            .addTo(g);
        }
      }

      if (showVehicles) {
        for (const v of vehicles) {
          L.circleMarker([v.latitude, v.longitude], {
            radius: 8,
            color: "#fb923c",
            fillColor: "#ea580c",
            fillOpacity: 0.85,
            weight: 2,
          })
            .bindPopup(`Vehicle · ${v.plate}`)
            .addTo(g);
        }
      }
    })();
  }, [evac, incidents, hazards, responders, vehicles, showAllIncidents, showResponders, showVehicles]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !weather) return;
    void (async () => {
      const L = await import("leaflet");
      const allIds: WeatherLayerId[] = ["rain-radar", "precipitation", "clouds", "temp", "wind"];

      for (const id of allIds) {
        const shouldShow = activeLayers.has(id);
        const existing = weatherLayersRef.current[id];
        if (!shouldShow) {
          if (existing) {
            map.removeLayer(existing);
            delete weatherLayersRef.current[id];
          }
          continue;
        }

        let url: string | null = null;
        let opacity = 0.6;
        if (id === "rain-radar") {
          url = rainViewerUrlRef.current;
          opacity = 0.55;
        } else if (owmReady) {
          const owm = weather.openWeather.layers.find((l) => l.id === id);
          url = owm?.urlTemplate ?? null;
        }

        if (!url) continue;

        if (existing) {
          map.removeLayer(existing);
          delete weatherLayersRef.current[id];
        }
        const tile = L.tileLayer(url, {
          opacity,
          maxZoom: id === "rain-radar" ? 12 : 19,
          attribution: id === "rain-radar" ? "Radar © RainViewer" : "© OpenWeatherMap",
        });
        weatherLayersRef.current[id] = tile;
        tile.addTo(map);
      }
    })();
  }, [activeLayers, weather, owmReady]);

  useEffect(() => {
    if (!pagasaLayerRef.current || !weather?.pagasa.items.length) return;
    void (async () => {
      const L = await import("leaflet");
      const g = pagasaLayerRef.current!;
      g.clearLayers();
      weather.pagasa.items.slice(0, 6).forEach((item, idx) => {
        const lat = ISABELA_EOC_LAT + idx * 0.012;
        const lng = ISABELA_EOC_LNG + idx * 0.008;
        L.marker([lat, lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="font-size:10px;padding:3px 6px;background:#0369a1;color:#e0f2fe;border:1px solid #38bdf8;border-radius:6px;font-weight:600">PAGASA</div>`,
            iconAnchor: [24, 12],
          }),
        })
          .bindPopup(`<b>${item.title}</b><br/><span style="font-size:11px">${item.summary}</span>`)
          .addTo(g);
      });
    })();
  }, [weather]);

  const toggleLayer = (id: WeatherLayerId): void => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const heightClass =
    layout === "fullscreen"
      ? "h-full min-h-[520px]"
      : "min-h-[480px] h-[55vh] lg:h-[calc(100vh-220px)]";

  return (
    <div
      className={`relative ${heightClass} ${className}`}
      data-eoc-map-build={EOC_MAP_BUILD}
    >
      <div ref={mapEl} className="absolute inset-0 z-0 bg-zinc-950" />

      {/* Floating HUD */}
      <div className="absolute top-3 left-3 z-[500] flex flex-wrap items-center gap-2 max-w-[calc(100%-1.5rem)]">
        <span className="rounded-lg border border-orange-500/40 bg-black/85 px-2.5 py-1 text-[10px] font-mono text-orange-200 backdrop-blur-md">
          EOC MAP · {EOC_MAP_BUILD}
        </span>
        <span className="rounded-lg border border-orange-500/25 bg-black/80 px-2.5 py-1 text-[10px] text-zinc-400 backdrop-blur-md">
          {hasMapboxToken() ? "Mapbox dark" : "Street basemap"} · Isabela City AOI
        </span>
        <button
          type="button"
          onClick={() => void loadData()}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-lg border border-orange-500/30 bg-black/85 px-2.5 py-1 text-[10px] text-orange-100 backdrop-blur-md hover:bg-orange-950/50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${busy ? "animate-spin" : ""}`} aria-hidden />
          Sync
        </button>
      </div>

      {liveToast ? (
        <p className="absolute top-14 left-3 z-[500] text-xs text-emerald-200 bg-emerald-950/90 border border-emerald-500/40 rounded-lg px-3 py-2 backdrop-blur-md animate-pulse">
          {liveToast}
        </p>
      ) : null}
      {error ? (
        <p className="absolute top-14 left-3 z-[500] text-xs text-rose-200 bg-rose-950/90 border border-rose-500/40 rounded-lg px-3 py-2 max-w-md">
          {error}
        </p>
      ) : null}

      {/* Layer toggles ON the map */}
      <div className="absolute top-3 right-3 z-[500] w-[min(100%,280px)] rounded-xl border border-orange-500/30 bg-black/88 backdrop-blur-md shadow-panel overflow-hidden">
        <div className="flex items-center gap-2 border-b border-orange-500/15 px-3 py-2">
          <Layers className="h-4 w-4 text-orange-400" aria-hidden />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-200">
            Weather layers
          </span>
        </div>
        <div className="p-2 space-y-1 max-h-[200px] overflow-y-auto scroll-ops">
          {(Object.keys(LAYER_META) as WeatherLayerId[]).map((id) => {
            const meta = LAYER_META[id];
            const disabled = meta.needsOwm && !owmReady;
            const on = activeLayers.has(id);
            const Icon = meta.icon;
            return (
              <label
                key={id}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer ${
                  disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-orange-500/10"
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  disabled={disabled}
                  onChange={() => !disabled && toggleLayer(id)}
                  className="rounded border-zinc-600 text-orange-500"
                />
                <Icon className="h-3.5 w-3.5 text-orange-300 shrink-0" aria-hidden />
                <span className="text-[11px] text-zinc-200">{meta.label}</span>
              </label>
            );
          })}
        </div>
        {!owmReady ? (
          <p className="px-3 pb-2 text-[10px] text-zinc-500 border-t border-orange-500/10">
            Rain radar works without a key. Add OPENWEATHERMAP_API_KEY on API for temp/wind/cloud OWM tiles.
          </p>
        ) : null}
        {weather?.situation ? (
          <p className="px-3 pb-2 text-[10px] text-orange-200/90 border-t border-orange-500/10 leading-relaxed">
            {weather.situation.current.weatherLabel}
            {weather.situation.current.temperatureC != null
              ? ` · ${weather.situation.current.temperatureC}°C`
              : ""}
            <br />
            <span className="text-zinc-500">{weather.situation.rainOutlook6h.headline}</span>
          </p>
        ) : null}
      </div>

      {/* PAGASA sidebar */}
      <div className="absolute bottom-3 left-3 z-[500] w-[min(100%,320px)] max-h-[38vh] rounded-xl border border-sky-500/35 bg-sky-950/88 backdrop-blur-md shadow-panel flex flex-col">
        <div className="shrink-0 border-b border-sky-500/20 px-3 py-2 flex items-center gap-2">
          <CloudRain className="h-4 w-4 text-sky-300" aria-hidden />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-100">
            PAGASA advisories
          </span>
        </div>
        <ul className="overflow-y-auto scroll-ops p-2 space-y-2 text-[11px] text-zinc-200 flex-1">
          {(weather?.pagasa.items ?? []).map((a) => (
            <li key={a.id} className="rounded-lg bg-black/30 border border-sky-500/15 p-2">
              <p className="font-medium text-sky-100">{a.title}</p>
              <p className="text-zinc-500 mt-1 line-clamp-3">{a.summary}</p>
              {a.link ? (
                <a
                  href={a.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 text-[10px] mt-1 inline-block hover:underline"
                >
                  pagasa.dost.gov.ph →
                </a>
              ) : null}
            </li>
          ))}
          {!weather?.pagasa.items.length ? (
            <li className="text-zinc-500 py-2">Loading PAGASA RSS…</li>
          ) : null}
        </ul>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 z-[500] rounded-xl border border-orange-500/25 bg-black/88 backdrop-blur-md px-3 py-2 text-[10px] text-zinc-300 space-y-1">
        <p className="font-semibold text-orange-200/90 uppercase tracking-wider mb-1">Legend</p>
        <p className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Incidents ({incidents.length})
        </p>
        <p className="flex items-center gap-1.5">
          <Home className="h-3 w-3 text-violet-400" aria-hidden /> Shelters ({evac.length})
        </p>
        {showResponders ? (
          <p className="flex items-center gap-1.5">
            <Users className="h-3 w-3 text-green-400" aria-hidden /> Responders ({responders.length})
          </p>
        ) : null}
        {showVehicles ? (
          <p className="flex items-center gap-1.5">
            <Truck className="h-3 w-3 text-orange-400" aria-hidden /> Vehicles ({vehicles.length})
          </p>
        ) : null}
        <p className="flex items-center gap-1.5">
          <MapPin className="h-3 w-3 text-orange-400" aria-hidden /> EOC pin
        </p>
        <p className="flex items-center gap-1.5 text-zinc-500 pt-1 border-t border-orange-500/15">
          <LocateFixed className="h-3 w-3" aria-hidden />
          WebSocket live shelters
        </p>
      </div>
    </div>
  );
}
