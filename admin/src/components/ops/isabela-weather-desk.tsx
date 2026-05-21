"use client";

import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useOpsSession } from "@/components/ops/ops-session-context";
import {
  ISABELA_CITY_LAT,
  ISABELA_CITY_LON,
  ISABELA_CITY_ZOOM,
  PH_SYNOPTIC_LAT,
  PH_SYNOPTIC_LON,
  PH_SYNOPTIC_ZOOM,
} from "@/lib/isabela-forecast-embed";
import { ISABELA_EOC_LAT, ISABELA_EOC_LNG } from "@/lib/isabela-eoc";
import { opsFetchJson } from "@/lib/ops-api";
import { useWindyLeafletLayer } from "@/hooks/use-windy-leaflet-layer";
import { WINDY_STYLE_BASEMAP_ATTRIBUTION, WINDY_STYLE_BASEMAP_URL } from "@/lib/windy-leaflet";

export type IsabelaWeatherDeskVariant = "compact" | "synoptic";

type WeatherSituation = {
  current: {
    temperatureC: number | null;
    humidityPct: number | null;
    weatherLabel: string;
    precipitationMm: number | null;
    rainMm: number | null;
  };
  rainOutlook6h: { headline: string; willRainLikely: boolean; maxPrecipProbPct: number };
  hazardZones: Array<{ type: string; summary: string }>;
};

type OpenMeteoCurrent = {
  current?: {
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    temperature_2m?: number;
    precipitation?: number;
  };
};

const OVERLAY_LABELS: Record<string, string> = {
  wind: "Wind (10 m)",
  temp: "Temperature",
  rain: "Rain radar (live)",
  clouds: "Cloud cover",
  lclouds: "Low clouds",
  pressure: "Pressure",
  waves: "Waves",
  gust: "Wind gusts",
};

type Props = {
  variant: IsabelaWeatherDeskVariant;
  overlay: string;
  title: string;
  className?: string;
};

/** ICDRRMO weather desk — dark basemap + Windy API tiles (no embed / no Windy logo). */
export function IsabelaWeatherDesk(props: Props): ReactElement {
  const { tokens } = useOpsSession();
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const [situation, setSituation] = useState<WeatherSituation | null>(null);
  const [windLine, setWindLine] = useState<string | null>(null);

  const { windyActive } = useWindyLeafletLayer({
    mapRef,
    mapReady,
    accessToken: tokens?.accessToken,
    overlay: props.overlay,
    opacity: props.overlay === "rain" ? 0.55 : 0.48,
  });

  const center: LatLngExpression =
    props.variant === "compact" ? [ISABELA_CITY_LAT, ISABELA_CITY_LON] : [PH_SYNOPTIC_LAT, PH_SYNOPTIC_LON];
  const zoom = props.variant === "compact" ? ISABELA_CITY_ZOOM : PH_SYNOPTIC_ZOOM;
  const frameClass =
    props.variant === "compact" ? "min-h-[220px] h-[248px]" : "h-[min(72vh,820px)] w-full min-h-[440px]";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = tokens?.accessToken;
      if (!token) return;
      try {
        const w = await opsFetchJson<WeatherSituation>("/weather/situation", token);
        if (!cancelled) setSituation(w);
      } catch {
        /* desk still shows map */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokens?.accessToken]);

  useEffect(() => {
    if (props.overlay !== "wind") {
      setWindLine(null);
      return;
    }
    let cancelled = false;
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${ISABELA_CITY_LAT}&longitude=${ISABELA_CITY_LON}` +
      "&current=wind_speed_10m,wind_direction_10m&timezone=Asia%2FManila";
    fetch(url)
      .then((r) => r.json())
      .then((j: OpenMeteoCurrent) => {
        if (cancelled) return;
        const spd = j.current?.wind_speed_10m;
        const dir = j.current?.wind_direction_10m;
        if (spd == null) return;
        setWindLine(dir != null ? `${Math.round(spd)} km/h · ${Math.round(dir)}°` : `${Math.round(spd)} km/h`);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [props.overlay]);

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !mapEl.current || mapRef.current) return;

      map = L.map(mapEl.current, { zoomControl: props.variant === "synoptic" }).setView(center, zoom);
      L.tileLayer(WINDY_STYLE_BASEMAP_URL, {
        attribution: WINDY_STYLE_BASEMAP_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map);

      const markers = L.layerGroup().addTo(map);
      markersRef.current = markers;

      L.circleMarker([ISABELA_EOC_LAT, ISABELA_EOC_LNG], {
        radius: props.variant === "compact" ? 8 : 6,
        color: "#f97316",
        fillColor: "#dc2626",
        fillOpacity: 0.85,
        weight: 2,
      })
        .addTo(markers)
        .bindPopup("ICDRRMO EOC · Isabela City");

      if (props.variant === "synoptic") {
        L.circleMarker([ISABELA_CITY_LAT, ISABELA_CITY_LON], {
          radius: 5,
          color: "#fb923c",
          fillColor: "#ea580c",
          fillOpacity: 0.7,
          weight: 1,
        })
          .addTo(markers)
          .bindPopup("Isabela City forecast pin");
      }

      mapRef.current = map;
      setMapReady(true);
    })();

    return () => {
      cancelled = true;
      setMapReady(false);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = null;
      }
    };
  }, [center, zoom, props.variant]);

  const overlayLabel = OVERLAY_LABELS[props.overlay] ?? props.overlay;
  const metrics = situation?.current;

  return (
    <div className={`relative overflow-hidden rounded-xl border border-orange-500/20 bg-black ${props.className ?? ""}`}>
      <div
        className="pointer-events-none absolute left-0 top-0 z-[500] flex max-w-[min(100%,280px)] flex-col gap-0.5 rounded-br-xl border-b border-r border-orange-500/30 bg-black/90 px-3 py-2 backdrop-blur-md"
        aria-hidden
      >
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-orange-400">ICDRRMO · Live weather</span>
        <span className="text-[11px] font-semibold text-white">{overlayLabel}</span>
        {windyActive ? (
          <span className="text-[9px] text-emerald-400/90">Live layers active</span>
        ) : (
          <span className="text-[9px] text-amber-400/80">Set WINDY_API_KEY on Render API (icdrrmo-api)</span>
        )}
        {metrics ? (
          <span className="text-[10px] text-zinc-400">
            {metrics.temperatureC != null ? `${metrics.temperatureC}°C` : "—"}
            {metrics.weatherLabel ? ` · ${metrics.weatherLabel}` : ""}
          </span>
        ) : null}
        {props.overlay === "wind" && windLine ? (
          <span className="text-[10px] text-orange-200/90">Wind {windLine}</span>
        ) : null}
        {props.overlay === "rain" && situation?.rainOutlook6h ? (
          <span className="text-[10px] text-orange-200/90">{situation.rainOutlook6h.headline}</span>
        ) : null}
      </div>

      <div ref={mapEl} className={`${frameClass} w-full`} role="img" aria-label={props.title} />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[400] bg-gradient-to-t from-[#030303] via-[#030303]/85 to-transparent px-3 pb-2 pt-8"
        aria-hidden
      >
        <p className="text-[9px] text-zinc-600">ICDRRMO live weather · GDACS/PAGASA advisories on unified map</p>
      </div>
    </div>
  );
}
