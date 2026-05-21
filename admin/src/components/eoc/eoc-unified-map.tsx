"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LatLngExpression, LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  AlertTriangle,
  ChevronDown,
  Cloud,
  CloudRain,
  Home,
  Info,
  Layers,
  MapPin,
  RefreshCw,
  Thermometer,
  Truck,
  Users,
  Wind,
} from "lucide-react";
import { getMapboxToken, hasMapboxToken } from "@/lib/env";
import { opsFetchJson } from "@/lib/ops-api";
import { fetchGdacsClientFeatures } from "@/lib/eoc-gdacs-client";
import {
  applyClientGdacsToGeo,
  applyOpenMeteoPagasaHint,
  applyPagasaWeatherToGeo,
  mergePagasaAdvisories,
  tileLayersFromWeather,
} from "@/lib/eoc-map-data";
import { fetchEocWeather, type EocWeatherBundle } from "@/lib/eoc-weather";
import {
  fetchEocHazardGeoJson,
  gdacsAlertColor,
  owmTileLayersFromGeoJson,
  type MergedHazardGeoJson,
} from "@/lib/eoc-weather-geojson";
import { OpsApiError, opsApiErrorUserMessage } from "@/lib/ops-api";
import {
  connectEocRealtime,
  type EvacuationCenterWsPayload,
} from "@/lib/eoc-realtime";
import { ISABELA_EOC_LAT, ISABELA_EOC_LNG } from "@/lib/isabela-eoc";
import { ISABELA_CITY_LAT, ISABELA_CITY_LON } from "@/lib/isabela-forecast-embed";
import { OPS_LEAFLET_ATTRIBUTION, OPS_LEAFLET_TILE_URL } from "@/lib/ops-leaflet-basemap";
import {
  fetchOpenMeteoClient,
  fetchRainViewerTileUrl,
  RAINVIEWER_MAX_NATIVE_ZOOM,
  type ClientOpenMeteo,
} from "@/lib/eoc-public-feeds";
import { EOC_MAP_BUILD, mapboxDarkTileUrl } from "@/lib/eoc-map-layers";

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
  { label: string; icon: typeof CloudRain; tile?: boolean }
> = {
  "rain-radar": { label: "Rain radar (live)", icon: CloudRain, tile: true },
  precipitation: { label: "Rain / precip", icon: CloudRain, tile: true },
  clouds: { label: "Clouds / satellite", icon: Cloud, tile: true },
  temp: { label: "Temperature (EOC)", icon: Thermometer },
  wind: { label: "Wind (EOC)", icon: Wind },
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
  const meteoOverlayRef = useRef<import("leaflet").LayerGroup | null>(null);
  const weatherLayersRef = useRef<Partial<Record<WeatherLayerId, import("leaflet").TileLayer>>>({});
  const gdacsGeoLayerRef = useRef<import("leaflet").GeoJSON | null>(null);
  const pagasaGeoLayerRef = useRef<import("leaflet").GeoJSON | null>(null);
  const [rainViewerUrl, setRainViewerUrl] = useState<string | null>(null);
  const [layerEpoch, setLayerEpoch] = useState(0);

  const [weather, setWeather] = useState<EocWeatherBundle | null>(null);
  const [clientMeteo, setClientMeteo] = useState<ClientOpenMeteo | null>(null);
  const [hazardGeo, setHazardGeo] = useState<MergedHazardGeoJson | null>(null);
  const [showGdacs, setShowGdacs] = useState(true);
  const [showPagasaPins, setShowPagasaPins] = useState(true);
  const [activeLayers, setActiveLayers] = useState<Set<WeatherLayerId>>(
    () => new Set<WeatherLayerId>(["rain-radar", "precipitation", "clouds"]),
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
  const [mobilePanel, setMobilePanel] = useState<"layers" | "pagasa" | "legend" | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);

  const showResponders = mode === "ops" || mode === "responder";
  const showAllIncidents = mode === "ops" || mode === "responder" || mode === "chairman";
  const showVehicles = mode === "ops";
  const owmLayers = owmTileLayersFromGeoJson(hazardGeo);
  const tileProvider = weather?.openWeather.provider ?? hazardGeo?.layers.openWeatherMap.properties?.source;
  const useWindy = tileProvider === "windy";
  const bundleLayers =
    tileLayersFromWeather(weather).length > 0 ? tileLayersFromWeather(weather) : owmLayers;
  const hasTileLayer = (id: WeatherLayerId): boolean => {
    if (bundleLayers.some((l) => l.id === id && l.urlTemplate)) return true;
    if (id === "rain-radar" || id === "precipitation") return Boolean(rainViewerUrl);
    const usePointOverlay =
      !useWindy &&
      (weather?.openWeather.openMeteoOverlays?.includes(id as "temp" | "wind") ?? false);
    if (id === "temp" || id === "wind") return usePointOverlay || Boolean(clientMeteo);
    return false;
  };
  const layerHint = hazardGeo?.properties.upstreamErrors;
  const pagasaAdvisories = mergePagasaAdvisories(hazardGeo, weather);
  const gdacsCount = hazardGeo?.layers.gdacs.features.length ?? 0;
  const dataStatus =
    gdacsCount > 0 || pagasaAdvisories.length > 0 || bundleLayers.length > 0 || Boolean(rainViewerUrl)
      ? `Live · GDACS ${gdacsCount} · PAGASA ${pagasaAdvisories.length} · tiles ${Math.max(bundleLayers.length, rainViewerUrl ? 1 : 0)}`
      : "No hazard data — tap Sync or check API deploy";

  const loadData = useCallback(async () => {
    const token = accessToken;
    if (!token) return;
    setBusy(true);
    setError(null);
    const loadErrors: string[] = [];
    try {
      const [rainUrl, clientGdacsRaw, openMeteo] = await Promise.all([
        fetchRainViewerTileUrl(),
        fetchGdacsClientFeatures(),
        fetchOpenMeteoClient(),
      ]);
      setRainViewerUrl(rainUrl);
      setClientMeteo(openMeteo);

      let wx: EocWeatherBundle | null = null;
      try {
        wx = await fetchEocWeather(token);
        setWeather(wx);
      } catch (e: unknown) {
        if (e instanceof OpsApiError && e.status === 401) {
          loadErrors.push(
            "Session expired (Unauthorized). Public radar/GDACS still load — sign in again for shelters and API advisories.",
          );
        } else {
          loadErrors.push(
            e instanceof OpsApiError ? opsApiErrorUserMessage(e) : "Weather API failed",
          );
        }
        setWeather(null);
      }

      let geo: MergedHazardGeoJson | null = wx?.hazardGeo ?? null;
      if (!geo && wx) {
        try {
          geo = await fetchEocHazardGeoJson(token);
        } catch (e: unknown) {
          if (!(e instanceof OpsApiError && e.status === 401)) {
            loadErrors.push(
              e instanceof OpsApiError ? opsApiErrorUserMessage(e) : "GeoJSON API failed",
            );
          }
        }
      }

      const clientGdacs =
        geo?.layers.gdacs.features.length ? [] : clientGdacsRaw;
      geo = applyClientGdacsToGeo(geo, clientGdacs);
      geo = applyPagasaWeatherToGeo(geo, wx);
      geo = applyOpenMeteoPagasaHint(geo, openMeteo);
      setHazardGeo(geo);

      const live =
        mode === "citizen"
          ? null
          : await opsFetchJson<OpsLive>("/map/ops-live", token).catch(() => null);

      const hasHazardData =
        (geo?.layers.gdacs.features.length ?? 0) > 0 ||
        (geo?.layers.pagasa.features.length ?? 0) > 0 ||
        Boolean(rainUrl) ||
        Boolean(openMeteo) ||
        (wx?.openWeather.layers.length ?? 0) > 0;
      if (loadErrors.length && !hasHazardData) {
        setError(loadErrors.join(" · "));
      } else if (loadErrors.some((m) => m.includes("Unauthorized"))) {
        setError(loadErrors.find((m) => m.includes("Unauthorized")) ?? loadErrors[0]);
      } else {
        setError(null);
      }

      setLayerEpoch((n) => n + 1);

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
        maxZoom: 18,
      }).setView(center, 9);

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
      meteoOverlayRef.current = L.layerGroup().addTo(map);
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

  useEffect(() => {
    const map = mapRef.current;
    const el = shellRef.current;
    if (!map || !el) return;
    const ro = new ResizeObserver(() => {
      window.requestAnimationFrame(() => map.invalidateSize());
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mapReady, mobilePanel]);

  const fitMapToData = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    void import("leaflet").then((L) => {
      const gdacsPts =
        hazardGeo?.layers.gdacs.features.flatMap((f) => {
          const g = f.geometry;
          if (g.type === "Point" && Array.isArray(g.coordinates) && g.coordinates.length >= 2) {
            const [lng, lat] = g.coordinates as number[];
            return [[lat, lng] as LatLngExpression];
          }
          return [];
        }) ?? [];
      const pts: LatLngExpression[] = [
        [ISABELA_EOC_LAT, ISABELA_EOC_LNG],
        ...evac.map((e) => [e.latitude, e.longitude] as LatLngExpression),
        ...incidents.map((i) => [i.latitude, i.longitude] as LatLngExpression),
        ...gdacsPts,
      ];
      if (pts.length < 2) {
        map.setView([ISABELA_CITY_LAT, ISABELA_CITY_LON], 11);
        return;
      }
      const bounds = L.latLngBounds(pts);
      const maxZoom = gdacsPts.length > 0 ? 8 : 13;
      map.fitBounds(bounds as LatLngBoundsExpression, { padding: [48, 48], maxZoom });
    });
  }, [evac, incidents, hazardGeo]);

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
    if (!map) return;
    void (async () => {
      const L = await import("leaflet");
      const allIds: WeatherLayerId[] = ["rain-radar", "precipitation", "clouds", "temp", "wind"];
      const owmById = new Map(owmLayers.map((l) => [l.id, l]));

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

        const fromBundle =
          bundleLayers.find((l) => l.id === id)?.urlTemplate ??
          weather?.openWeather.layers.find((l) => l.id === id)?.urlTemplate ??
          owmById.get(id)?.urlTemplate ??
          null;

        let url: string | null = fromBundle;
        let opacity = 0.55;
        if (id === "rain-radar" || id === "precipitation") {
          opacity = id === "rain-radar" ? 0.55 : 0.5;
          if (!url && !useWindy) url = rainViewerUrl;
        } else if (id === "clouds") {
          opacity = 0.45;
          if (!url && !useWindy) url = rainViewerUrl;
        } else if (id === "temp") {
          opacity = 0.5;
        } else if (id === "wind") {
          opacity = 0.55;
        }

        if (!url) continue;

        const isRainViewer =
          !useWindy &&
          (url.includes("rainviewer.com") || url.includes("tilecache.rainviewer"));
        const isWindy = url.includes("tiles.windy.com");

        if (existing) {
          map.removeLayer(existing);
          delete weatherLayersRef.current[id];
        }
        const tile = L.tileLayer(url, {
          opacity,
          minZoom: 3,
          maxZoom: 18,
          maxNativeZoom: isRainViewer ? RAINVIEWER_MAX_NATIVE_ZOOM : 18,
          zIndex: 450,
          pane: "overlayPane",
          attribution: isWindy
            ? "ICDRRMO · Live weather layers"
            : isRainViewer
              ? "Radar © RainViewer"
              : "© OpenWeatherMap",
        });
        weatherLayersRef.current[id] = tile;
        tile.addTo(map);
        tile.bringToFront();
      }

      if (
        !useWindy &&
        (activeLayers.has("rain-radar") ||
          activeLayers.has("precipitation") ||
          activeLayers.has("clouds"))
      ) {
        const z = map.getZoom();
        if (z > RAINVIEWER_MAX_NATIVE_ZOOM + 2) {
          map.setZoom(RAINVIEWER_MAX_NATIVE_ZOOM + 1);
        }
      }
    })();
  }, [activeLayers, weather, bundleLayers, owmLayers, rainViewerUrl, layerEpoch, useWindy]);

  useEffect(() => {
    const map = mapRef.current;
    const g = meteoOverlayRef.current;
    if (!map || !g) return;
    void (async () => {
      const L = await import("leaflet");
      g.clearLayers();
      const cur = weather?.situation?.current;
      const tempC = cur?.temperatureC ?? clientMeteo?.temperatureC ?? null;
      const windSpd = cur?.windSpeedKmh ?? clientMeteo?.windSpeedKmh ?? null;
      const windDir = cur?.windDirectionDeg ?? clientMeteo?.windDirectionDeg ?? null;
      const usePointTemp =
        activeLayers.has("temp") &&
        !bundleLayers.some((l) => l.id === "temp" && l.urlTemplate);
      const usePointWind =
        activeLayers.has("wind") &&
        !bundleLayers.some((l) => l.id === "wind" && l.urlTemplate);

      if (usePointTemp && tempC != null) {
        const t = tempC;
        const hue = t >= 32 ? 0 : t >= 28 ? 25 : t >= 24 ? 45 : 200;
        L.circle([ISABELA_CITY_LAT, ISABELA_CITY_LON], {
          radius: 28_000,
          color: `hsl(${hue} 80% 45%)`,
          fillColor: `hsl(${hue} 80% 50%)`,
          fillOpacity: 0.28,
          weight: 2,
        })
          .bindPopup(`<b>Temperature</b><br/>${t}°C at Isabela City EOC grid`)
          .addTo(g);
      }
      if (usePointWind && windSpd != null && windDir != null) {
        const spd = windSpd;
        const dir = windDir;
        L.marker([ISABELA_CITY_LAT, ISABELA_CITY_LON], {
          icon: L.divIcon({
            className: "",
            html: `<div style="transform:rotate(${dir}deg);font-size:22px;line-height:1;color:#38bdf8;text-shadow:0 0 6px #000">↑</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        })
          .bindPopup(`<b>Wind</b><br/>${spd} km/h · from ${dir}°`)
          .addTo(g);
      }
    })();
  }, [activeLayers, weather, clientMeteo]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !hazardGeo) return;
    void (async () => {
      const L = await import("leaflet");

      if (gdacsGeoLayerRef.current) {
        map.removeLayer(gdacsGeoLayerRef.current);
        gdacsGeoLayerRef.current = null;
      }
      if (showGdacs && hazardGeo.layers.gdacs.features.length > 0) {
        gdacsGeoLayerRef.current = L.geoJSON(
          hazardGeo.layers.gdacs as GeoJSON.FeatureCollection,
          {
            pointToLayer: (feature, latlng) => {
              const level = String(feature.properties?.alertLevel ?? "");
              const color = gdacsAlertColor(level);
              return L.circleMarker(latlng, {
                radius: 10,
                color,
                fillColor: color,
                fillOpacity: 0.85,
                weight: 2,
              });
            },
            style: (feature) => {
              const level = String(feature?.properties?.alertLevel ?? "");
              const color = gdacsAlertColor(level);
              return { color, weight: 2, fillOpacity: 0.25 };
            },
            onEachFeature: (feature, layer) => {
              const p = feature.properties ?? {};
              const title = String(p.title ?? "GDACS alert");
              const desc = String(p.description ?? "").slice(0, 400);
              const et = String(p.eventType ?? "");
              const al = String(p.alertLevel ?? "");
              layer.bindPopup(
                `<b>${title}</b><br/><span style="font-size:11px">${et} · ${al}</span><br/><span style="font-size:10px">${desc}</span>`,
              );
            },
          },
        ).addTo(map);
      }

      if (pagasaGeoLayerRef.current) {
        map.removeLayer(pagasaGeoLayerRef.current);
        pagasaGeoLayerRef.current = null;
      }
      if (showPagasaPins && hazardGeo.layers.pagasa.features.length > 0) {
        pagasaGeoLayerRef.current = L.geoJSON(
          hazardGeo.layers.pagasa as GeoJSON.FeatureCollection,
          {
            pointToLayer: (_feature, latlng) =>
              L.marker(latlng, {
                icon: L.divIcon({
                  className: "",
                  html: `<div style="font-size:10px;padding:3px 6px;background:#0369a1;color:#e0f2fe;border:1px solid #38bdf8;border-radius:6px;font-weight:600">PAGASA</div>`,
                  iconAnchor: [24, 12],
                }),
              }),
            onEachFeature: (feature, layer) => {
              const p = feature.properties ?? {};
              const title = String(p.title ?? "PAGASA");
              const body = String(p.excerpt ?? p.summary ?? "");
              const link = String(p.link ?? "");
              layer.bindPopup(
                `<b>${title}</b><br/><span style="font-size:11px">${body}</span>` +
                  (link ? `<br/><a href="${link}" target="_blank" rel="noopener">Official link</a>` : ""),
              );
            },
          },
        ).addTo(map);
      }
    })();
  }, [hazardGeo, showGdacs, showPagasaPins, mapReady]);

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
      ? "h-full min-h-0"
      : "h-full min-h-[min(360px,50dvh)]";

  const mobileTab = (id: "layers" | "pagasa" | "legend", label: string, Icon: typeof Layers): ReactElement => {
    const active = mobilePanel === id;
    return (
      <button
        type="button"
        onClick={() => setMobilePanel(active ? null : id)}
        className={
          active
            ? "shrink-0 inline-flex items-center gap-1 rounded-lg border border-orange-400/50 bg-orange-950/60 px-2.5 py-1 text-[10px] font-semibold text-orange-100"
            : "shrink-0 inline-flex items-center gap-1 rounded-lg border border-orange-500/20 bg-zinc-900/60 px-2.5 py-1 text-[10px] text-zinc-400"
        }
      >
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </button>
    );
  };

  const layerControls = (
    <div className="space-y-1">
      <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-orange-500/10">
        <input
          type="checkbox"
          checked={showGdacs}
          onChange={() => setShowGdacs((v) => !v)}
          className="rounded border-zinc-600 text-orange-500"
        />
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden />
        <span className="text-[11px] text-zinc-200">GDACS ({gdacsCount})</span>
      </label>
      <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-orange-500/10">
        <input
          type="checkbox"
          checked={showPagasaPins}
          onChange={() => setShowPagasaPins((v) => !v)}
          className="rounded border-zinc-600 text-orange-500"
        />
        <CloudRain className="h-3.5 w-3.5 text-sky-300 shrink-0" aria-hidden />
        <span className="text-[11px] text-zinc-200">PAGASA pins ({pagasaAdvisories.length})</span>
      </label>
      {(Object.keys(LAYER_META) as WeatherLayerId[]).map((id) => {
        const meta = LAYER_META[id];
        const available = hasTileLayer(id) || id === "temp" || id === "wind";
        const on = activeLayers.has(id);
        const Icon = meta.icon;
        return (
          <label
            key={id}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-orange-500/10 ${
              !available ? "opacity-70" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={on}
              onChange={() => toggleLayer(id)}
              className="rounded border-zinc-600 text-orange-500"
            />
            <Icon className="h-3.5 w-3.5 text-orange-300 shrink-0" aria-hidden />
            <span className="text-[11px] text-zinc-200">{meta.label}</span>
          </label>
        );
      })}
      {layerHint?.gdacs ? (
        <p className="px-1 pt-1 text-[10px] text-amber-400/90">GDACS: {layerHint.gdacs}</p>
      ) : null}
      {layerHint?.pagasaRss || layerHint?.pagasaPortal ? (
        <p className="px-1 text-[10px] text-sky-400/80">
          PAGASA: {layerHint.pagasaPortal ?? layerHint.pagasaRss}
        </p>
      ) : null}
      <p className="px-1 pt-1 text-[10px] text-zinc-500 leading-snug">
        Tiles: {useWindy ? "ICDRRMO live layers (API)" : weather?.openWeather.provider ?? "RainViewer fallback"}.
        {useWindy ? " Server-side WINDY_API_KEY on Render." : " Temp/wind point overlay when no tile URL."}
      </p>
      {weather?.situation || clientMeteo ? (
        <p className="px-1 pt-1 text-[10px] text-orange-200/90 leading-snug">
          {weather?.situation?.current.weatherLabel ?? clientMeteo?.weatherLabel}
          {(weather?.situation?.current.temperatureC ?? clientMeteo?.temperatureC) != null
            ? ` · ${weather?.situation?.current.temperatureC ?? clientMeteo?.temperatureC}°C`
            : ""}
          <span className="text-zinc-500 block">
            {weather?.situation?.rainOutlook6h.headline ?? clientMeteo?.headline}
          </span>
        </p>
      ) : null}
    </div>
  );

  const pagasaList = (
    <ul className="space-y-2 text-[11px] text-zinc-200">
      {pagasaAdvisories.map((a) => (
        <li key={a.id} className="rounded-lg bg-black/30 border border-sky-500/15 p-2">
          <p className="font-medium text-sky-100 line-clamp-2">{a.title}</p>
          <p className="text-[9px] text-zinc-600 uppercase">{a.kind}</p>
          <p className="text-zinc-500 mt-1 line-clamp-2">{a.summary}</p>
          {a.link ? (
            <a
              href={a.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 text-[10px] mt-1 inline-block hover:underline"
            >
              Official link →
            </a>
          ) : null}
        </li>
      ))}
      {!pagasaAdvisories.length ? (
        <li className="text-zinc-500 py-2">Loading PAGASA (portal + RSS)…</li>
      ) : null}
    </ul>
  );

  const legendBlock = (
    <div className="text-[10px] text-zinc-300 space-y-1">
      <p className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" /> Incidents ({incidents.length})
      </p>
      <p className="flex items-center gap-1.5">
        <Home className="h-3 w-3 text-violet-400 shrink-0" aria-hidden /> Shelters ({evac.length})
      </p>
      {showResponders ? (
        <p className="flex items-center gap-1.5">
          <Users className="h-3 w-3 text-green-400 shrink-0" aria-hidden /> Responders ({responders.length})
        </p>
      ) : null}
      {showVehicles ? (
        <p className="flex items-center gap-1.5">
          <Truck className="h-3 w-3 text-orange-400 shrink-0" aria-hidden /> Vehicles ({vehicles.length})
        </p>
      ) : null}
      <p className="flex items-center gap-1.5">
        <MapPin className="h-3 w-3 text-orange-400 shrink-0" aria-hidden /> EOC
      </p>
      <p className="flex items-center gap-1.5">
        <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" aria-hidden /> GDACS ({gdacsCount})
      </p>
      <p className="flex items-center gap-1.5">
        <CloudRain className="h-3 w-3 text-sky-400 shrink-0" aria-hidden /> PAGASA ({pagasaAdvisories.length})
      </p>
    </div>
  );

  return (
    <div
      ref={shellRef}
      className={`eoc-unified-map flex flex-col min-h-0 overflow-hidden bg-zinc-950 ${heightClass} ${className}`}
      data-eoc-map-build={EOC_MAP_BUILD}
    >
      {/* Toolbar — never overlays map */}
      <header className="shrink-0 flex flex-col gap-1.5 border-b border-orange-500/15 bg-zinc-950/98 px-2 py-1.5 sm:px-3">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="rounded-md border border-orange-500/35 bg-black/80 px-2 py-0.5 text-[9px] font-mono text-orange-200 truncate max-w-[140px] sm:max-w-none">
            {EOC_MAP_BUILD}
          </span>
          <span className="hidden sm:inline text-[9px] text-zinc-500 truncate max-w-[50%]">
            {dataStatus}
          </span>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={busy}
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-orange-500/30 bg-black/80 px-2 py-0.5 text-[10px] text-orange-100 hover:bg-orange-950/50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${busy ? "animate-spin" : ""}`} aria-hidden />
            Sync
          </button>
        </div>
        {liveToast ? (
          <p className="text-[10px] text-emerald-200 bg-emerald-950/80 border border-emerald-500/30 rounded-md px-2 py-1">
            {liveToast}
          </p>
        ) : null}
        {error ? (
          <p className="text-[10px] text-rose-200 bg-rose-950/80 border border-rose-500/30 rounded-md px-2 py-1">
            {error}
          </p>
        ) : null}
        <div className="flex gap-1 overflow-x-auto scroll-ops pb-0.5 lg:hidden">
          {mobileTab("layers", "Layers", Layers)}
          {mobileTab("pagasa", "PAGASA", CloudRain)}
          {mobileTab("legend", "Legend", Info)}
        </div>
      </header>

      {/* Map + desktop side rail (no absolute overlays) */}
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <div className="relative flex-1 min-h-[200px] sm:min-h-[260px] lg:min-h-[280px] min-w-0 order-1">
          <div ref={mapEl} className="absolute inset-0 z-0 bg-zinc-950 eoc-map-canvas" />
        </div>

        <aside className="hidden lg:flex lg:flex-col lg:w-56 xl:w-64 shrink-0 order-2 border-t lg:border-t-0 lg:border-l border-orange-500/15 bg-zinc-950/98 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto scroll-ops divide-y divide-orange-500/10">
            <section className="p-2">
              <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-orange-200 mb-1.5">
                <Layers className="h-3.5 w-3.5" aria-hidden /> Layers
              </h3>
              {layerControls}
            </section>
            <section className="p-2 max-h-[28vh] overflow-y-auto scroll-ops">
              <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-sky-100 mb-1.5">
                <CloudRain className="h-3.5 w-3.5" aria-hidden /> PAGASA
              </h3>
              {pagasaList}
            </section>
            <section className="p-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-orange-200/90 mb-1.5">
                Legend
              </h3>
              {legendBlock}
            </section>
          </div>
        </aside>
      </div>

      {/* Mobile panels — below map, not on top */}
      {mobilePanel ? (
        <aside className="lg:hidden shrink-0 border-t border-orange-500/15 bg-zinc-950/98 max-h-[min(36dvh,240px)] overflow-y-auto scroll-ops">
          {mobilePanel === "layers" ? (
            <div className="p-2">
              <button
                type="button"
                className="flex w-full items-center justify-between text-[10px] font-semibold uppercase text-orange-200 mb-1"
                onClick={() => setMobilePanel(null)}
              >
                <span className="flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" aria-hidden /> Weather layers
                </span>
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              </button>
              {layerControls}
            </div>
          ) : null}
          {mobilePanel === "pagasa" ? (
            <div className="p-2">
              <button
                type="button"
                className="flex w-full items-center justify-between text-[10px] font-semibold uppercase text-sky-100 mb-1"
                onClick={() => setMobilePanel(null)}
              >
                <span className="flex items-center gap-1">
                  <CloudRain className="h-3.5 w-3.5" aria-hidden /> PAGASA advisories
                </span>
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              </button>
              {pagasaList}
            </div>
          ) : null}
          {mobilePanel === "legend" ? (
            <div className="p-2">
              <button
                type="button"
                className="flex w-full items-center justify-between text-[10px] font-semibold uppercase text-orange-200/90 mb-1"
                onClick={() => setMobilePanel(null)}
              >
                Legend
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              </button>
              {legendBlock}
            </div>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}
