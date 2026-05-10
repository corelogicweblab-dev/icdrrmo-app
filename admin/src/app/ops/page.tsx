"use client";

import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Home,
  Map,
  Radar,
  Radio,
  ShieldAlert,
  Siren,
  Users,
} from "lucide-react";
import { getHealthCheckUrl, hasMapboxToken } from "@/lib/env";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { formatOpsSync, incidentBorderClass, statusBadgeClass } from "@/components/ops/ops-format";
import type { OpsIncident } from "@/components/ops/ops-types";
import Link from "next/link";
import { OpsKpiCard, OpsPanelCard } from "@/components/ops/ops-widgets";
import { SituationMap } from "@/components/situation-map";
import { incidentsToMapPins } from "@/lib/map-pins";
import { opsFetchJson } from "@/lib/ops-api";

type WeatherSituation = {
  fetchedAt: string;
  source: string;
  upstreamError?: string;
  hazardDisclaimer: string;
  current: {
    temperatureC: number | null;
    humidityPct: number | null;
    weatherLabel: string;
    rainMm: number | null;
    isDay: boolean | null;
  };
  rainOutlook6h: {
    willRainLikely: boolean;
    headline: string;
    maxPrecipProbPct: number;
    totalRainMm: number;
  };
  nextHours: Array<{
    time: string;
    precipProbPct: number | null;
    rainMm: number | null;
    precipMm: number | null;
  }>;
  hazardZones: Array<{
    type: string;
    label: string;
    description: string;
    barangays: Array<{ code: string; name: string }>;
  }>;
};

type EvacCenterRow = {
  id: string;
  name: string;
  capacity: number | null;
  occupancy: number;
  isActive?: boolean;
  barangay?: { name: string; code: string } | null;
};

function SparkBars(props: { values: number[]; color: string }): ReactElement {
  const max = Math.max(...props.values, 1);
  return (
    <div className="flex items-end gap-px h-[72px]" role="img" aria-label="Relative trend chart">
      {props.values.map((v, i) => (
        <div key={i} className={`flex-1 min-w-[3px] rounded-sm ${props.color}`} style={{ height: `${Math.max(8, (v / max) * 100)}%` }} />
      ))}
    </div>
  );
}

export default function OpsCommandDashboardPage(): ReactElement {
  const {
    socketState,
    wsErrorDetail,
    feed,
    queue,
    queueError,
    apiReachable,
    lastQueueSync,
    queueLoading,
    refreshQueue,
    tokens,
  } = useOpsSession();

  const openCount = queue.length;
  const mapPins = useMemo(() => incidentsToMapPins(queue), [queue]);
  const wsLabel =
    socketState === "live" ? "Synchronized" : socketState === "error" ? "Fault" : "Standby";

  const [weather, setWeather] = useState<WeatherSituation | null>(null);
  const [weatherErr, setWeatherErr] = useState<string | null>(null);
  const [evacRows, setEvacRows] = useState<EvacCenterRow[]>([]);
  const [evacErr, setEvacErr] = useState<string | null>(null);

  useEffect(() => {
    const token = tokens?.accessToken;
    if (!token) {
      setWeather(null);
      setEvacRows([]);
      setWeatherErr(null);
      setEvacErr(null);
      return;
    }
    const accessToken = token;
    let cancelled = false;
    async function loadSafe(): Promise<void> {
      setWeatherErr(null);
      setEvacErr(null);
      try {
        const w = await opsFetchJson<WeatherSituation>("/weather/situation", accessToken);
        if (!cancelled) setWeather(w);
      } catch {
        if (!cancelled) {
          setWeather(null);
          setWeatherErr("Weather snapshot unavailable (API or role).");
        }
      }
      try {
        const e = await opsFetchJson<EvacCenterRow[]>("/evacuation-centers", accessToken);
        if (!cancelled) setEvacRows(Array.isArray(e) ? e : []);
      } catch {
        if (!cancelled) {
          setEvacRows([]);
          setEvacErr("Evacuation centers unavailable.");
        }
      }
    }
    void loadSafe();
    const id = setInterval(() => void loadSafe(), 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [tokens?.accessToken]);

  const shelteredTotal = useMemo(
    () => evacRows.filter((r) => r.isActive !== false).reduce((a, r) => a + (r.occupancy ?? 0), 0),
    [evacRows],
  );

  const proneBarangayCount = useMemo(() => {
    if (!weather?.hazardZones?.length) return 0;
    const codes = new Set<string>();
    for (const z of weather.hazardZones) {
      for (const b of z.barangays) codes.add(b.code);
    }
    return codes.size;
  }, [weather]);

  const evacDisplay = useMemo(() => {
    return [...evacRows]
      .filter((r) => r.isActive !== false)
      .sort((a, b) => (b.occupancy ?? 0) - (a.occupancy ?? 0) || a.name.localeCompare(b.name));
  }, [evacRows]);

  const mockDispatchLatency = [12, 9, 11, 8, 7, 14, 10, 9, 8, 6, 11, 9];

  return (
    <div className="p-4 lg:p-6 space-y-5 pb-28">
      {apiReachable === false ? (
        <div
          className="rounded-xl border border-amber-500/25 bg-amber-950/20 px-5 py-4 text-sm"
          role="status"
        >
          <p className="font-semibold text-amber-100">Platform readiness degraded</p>
          <p className="mt-2 text-xs text-amber-200/80 leading-relaxed max-w-3xl">
            Cannot verify DB readiness ({getHealthCheckUrl()}). Confirm Postgres migrations and env.
          </p>
        </div>
      ) : null}
      {queueError ? (
        <div
          className="rounded-xl border border-rose-500/25 bg-rose-950/20 px-5 py-4 text-sm text-rose-100"
          role="alert"
        >
          {queueError}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-500/25 bg-gradient-to-r from-rose-950/50 to-transparent px-4 py-3">
        <Siren className="h-6 w-6 text-rose-400 shrink-0 animate-alert-blink" aria-hidden />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-300/90">
            Emergency level
          </p>
          <p className="text-sm font-semibold text-white">
            {openCount >= 10 ? "CRITICAL · Mass-casualty posture" : openCount >= 3 ? "ELEVATED" : "ROUTINE"}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-zinc-400 max-w-3xl justify-end">
          <span>
            <span className="text-zinc-500">Sheltered (DB headcount)</span>
            <span className="ml-2 font-mono text-emerald-300">{shelteredTotal}</span>
          </span>
          <span className="min-w-[10rem]">
            <span className="text-zinc-500">Rain next ~6h (model)</span>
            <span
              className={`ml-2 font-semibold ${weather?.rainOutlook6h.willRainLikely ? "text-amber-200" : "text-sky-200"}`}
            >
              {weather ? (weather.rainOutlook6h.willRainLikely ? "Likely" : "Unlikely") : "—"}
            </span>
          </span>
          <span>
            <span className="text-zinc-500">Hazard reference barangays</span>
            <span className="ml-2 text-sky-200">{proneBarangayCount ? `${proneBarangayCount} flagged` : "—"}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OpsKpiCard
          icon={AlertTriangle}
          label="Active incidents"
          value={String(openCount)}
          subtitle="Open queue snapshot"
          accent="rose"
        />
        <OpsKpiCard
          icon={Radar}
          label="Incoming SOS"
          value={String(queue.filter((q) => (q.channel ?? "").includes("SMS")).length)}
          subtitle="SMS-channel rows in current queue"
          accent="amber"
        />
        <OpsKpiCard
          icon={Radio}
          label="Realtime bus"
          value={wsLabel}
          subtitle={socketState === "live" ? "Subscribed · /realtime" : wsErrorDetail ?? "Socket.IO"}
          accent={socketState === "live" ? "emerald" : socketState === "error" ? "rose" : "zinc"}
        />
        <OpsKpiCard
          icon={Activity}
          label="Telemetry buffer"
          value={String(feed.length)}
          subtitle={`Queue sync · ${formatOpsSync(lastQueueSync)}`}
          accent="sky"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <OpsPanelCard
          title="Weather — Isabela City (live model)"
          subtitle="Open-Meteo hourly grid · not a PAGASA official warning"
        >
          {weatherErr ? (
            <p className="text-xs text-rose-300">{weatherErr}</p>
          ) : !weather ? (
            <p className="text-xs text-zinc-500">Loading forecast…</p>
          ) : (
            <div className="space-y-3 text-xs text-zinc-300">
              {weather.upstreamError ? (
                <p className="text-[11px] text-amber-200/90">Upstream: {weather.upstreamError}</p>
              ) : null}
              <div className="rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Will it rain (next ~6h)?</p>
                <p
                  className={`mt-1 text-sm font-bold ${weather.rainOutlook6h.willRainLikely ? "text-amber-200" : "text-sky-200"}`}
                >
                  {weather.rainOutlook6h.willRainLikely ? "Yes — plan for wet conditions" : "Probably not — still monitor official advisories"}
                </p>
                <p className="mt-2 text-[11px] text-zinc-400 leading-relaxed">{weather.rainOutlook6h.headline}</p>
                <p className="mt-2 font-mono text-[10px] text-zinc-500">
                  Max hourly chance {weather.rainOutlook6h.maxPrecipProbPct}% · model rain sum ~{weather.rainOutlook6h.totalRainMm} mm
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] text-zinc-400">
                <span>
                  Now:{" "}
                  <span className="text-zinc-200">
                    {weather.current.temperatureC != null ? `${weather.current.temperatureC}°C` : "—"} ·{" "}
                    {weather.current.weatherLabel}
                  </span>
                </span>
                {weather.current.humidityPct != null ? (
                  <span>
                    RH: <span className="text-zinc-200">{weather.current.humidityPct}%</span>
                  </span>
                ) : null}
              </div>
              <ul className="space-y-1.5 border-t border-white/[0.06] pt-2 text-[11px] text-zinc-500">
                {weather.nextHours.slice(0, 6).map((h) => (
                  <li key={h.time} className="flex justify-between gap-2 font-mono">
                    <span>{new Date(h.time).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    <span>
                      {(h.precipProbPct ?? 0)}% · rain {h.rainMm ?? h.precipMm ?? 0} mm
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-zinc-600">Updated {new Date(weather.fetchedAt).toLocaleString("en-PH")} · {weather.source}</p>
            </div>
          )}
        </OpsPanelCard>
        <OpsPanelCard
          title="Flood & landslide — Isabela City"
          subtitle="Barangay-level reference (see disclaimer). Cross-check with official LGU / MGB maps."
        >
          <p className="mb-3 text-[11px]">
            <Link href="/ops/map" className="text-sky-400 hover:underline">
              Open tactical map (GIS layers)
            </Link>
          </p>
          {!weather ? (
            <p className="text-xs text-zinc-500">Loading hazard reference…</p>
          ) : (
            <div className="space-y-3 text-[11px] text-zinc-400">
              <p className="text-[10px] leading-relaxed text-amber-200/85 border border-amber-500/20 rounded-lg px-2 py-1.5 bg-amber-950/20">
                {weather.hazardDisclaimer}
              </p>
              {weather.hazardZones.map((z) => (
                <div key={z.type} className="rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-rose-200/80">{z.label}</p>
                  <p className="mt-1 text-[11px] text-zinc-500 leading-snug">{z.description}</p>
                  <p className="mt-2 text-[10px] text-zinc-500">
                    Barangays ({z.barangays.length}):{" "}
                    <span className="text-zinc-300">{z.barangays.map((b) => b.name).join(", ")}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </OpsPanelCard>
        <OpsPanelCard title="Active evacuations" subtitle="Live occupancy + capacity from GET /evacuation-centers">
          {evacErr ? <p className="text-xs text-rose-300">{evacErr}</p> : null}
          {!evacErr && evacDisplay.length === 0 ? (
            <p className="text-xs text-zinc-500 leading-relaxed">
              No evacuation centers on file, or none returned for your role. Headcount stays <span className="font-mono text-zinc-300">0</span> until
              centers exist and <span className="text-zinc-400">occupancy</span> is updated in the database (Evacuation admin page / API).
            </p>
          ) : (
            <ul className="space-y-3">
              {evacDisplay.slice(0, 8).map((row) => {
                const cap = row.capacity != null && row.capacity > 0 ? row.capacity : null;
                const pct = cap ? Math.min(100, Math.round(((row.occupancy ?? 0) / cap) * 100)) : row.occupancy > 0 ? 100 : 0;
                return (
                  <li key={row.id} className="text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-zinc-300 min-w-0">
                        <Home className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden />
                        <span className="truncate">{row.name}</span>
                      </span>
                      <span className="font-mono text-zinc-400 shrink-0">
                        {row.occupancy ?? 0}
                        {cap != null ? ` / ${cap}` : " / —"}
                      </span>
                    </div>
                    {row.barangay?.name ? (
                      <p className="mt-0.5 pl-6 text-[10px] text-zinc-600">{row.barangay.name}</p>
                    ) : null}
                    <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500/60 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {evacDisplay.length > 8 ? (
            <p className="mt-3 text-[10px] text-zinc-600">
              +{evacDisplay.length - 8} more — open <Link href="/ops/evacuation" className="text-sky-400 hover:underline">Evacuation</Link>
            </p>
          ) : null}
        </OpsPanelCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <OpsPanelCard
          title="Median dispatch latency (min · sim)"
          subtitle="Demo spark series until dispatch timestamps are logged for analytics"
          className="xl:col-span-6"
        >
          <SparkBars values={mockDispatchLatency.map((x) => 20 - x)} color="bg-sky-500/55" />
        </OpsPanelCard>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <section className="xl:col-span-5 flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-zinc-950/50 shadow-panel">
          <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] bg-black/25 px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Map className="h-4 w-4 text-rose-400/90" aria-hidden />
              Tactical map — layers in GIS panel
            </h2>
            <ShieldAlert className="h-4 w-4 text-zinc-600" aria-hidden />
          </div>
          <div className="min-h-0 w-full flex-1">
            <SituationMap incidentPins={mapPins} />
          </div>
        </section>

        <section className="xl:col-span-4 flex min-h-[360px] flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-zinc-950/50 shadow-panel">
          <div className="border-b border-white/[0.06] px-4 py-3 bg-black/25 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <AlertTriangle className="h-4 w-4 text-rose-400" aria-hidden />
              Active incident queue
            </h2>
            <button
              type="button"
              disabled={queueLoading || !tokens}
              onClick={() => tokens?.accessToken && void refreshQueue(tokens.accessToken)}
              className="text-[10px] uppercase tracking-wide text-zinc-500 hover:text-zinc-300 disabled:opacity-40"
            >
              Refresh
            </button>
          </div>
          <ul className="scroll-ops flex-1 space-y-2 overflow-auto p-3">
            {queue.length === 0 && !queueError ? (
              <li className="flex flex-col items-center justify-center py-14 px-6 text-center">
                <Users className="h-10 w-10 text-zinc-700 mb-4" aria-hidden />
                <p className="text-sm font-medium text-zinc-400">No incidents in ops queue</p>
                <p className="mt-2 max-w-xs text-xs text-zinc-600">
                  Live SOS populate this feed. Use Citizen app or `/citizen` smoke test.
                </p>
              </li>
            ) : null}
            {queue.map((row: OpsIncident) => {
              const r = row;
              const t = r.createdAt ? new Date(r.createdAt).toLocaleString("en-PH") : "—";
              return (
                <li
                  key={r.id}
                  className={`rounded-xl border border-white/[0.06] border-l-[3px] bg-black/35 p-4 ${incidentBorderClass(r.type)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-rose-200/95">
                      {(r.title ?? r.type ?? "INCIDENT").replace(/_/g, " ")}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-zinc-500">{t}</span>
                  </div>
                  <p className="mt-2 font-mono text-[11px] text-zinc-500 truncate" title={r.id}>
                    {r.id}
                  </p>
                  <span
                    className={`mt-3 inline-block rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(r.status)}`}
                  >
                    {r.status.replace(/_/g, " ")}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="xl:col-span-3 flex min-h-[360px] flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-zinc-950/50 shadow-panel">
          <div className="border-b border-white/[0.06] px-4 py-3 bg-black/25">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Activity className="h-4 w-4 text-emerald-400" aria-hidden />
              Realtime notifications
            </h2>
            <p className="mt-1 text-[11px] text-zinc-500">Ops channel ingest</p>
          </div>
          <ul className="scroll-ops flex-1 space-y-0 overflow-auto px-3 py-2 font-mono text-[11px]">
            {feed.length === 0 ? (
              <li className="py-10 text-center text-zinc-600 text-xs px-4">Listening on /realtime…</li>
            ) : (
              feed.map((line, i) => {
                const isInc = line.includes("INCIDENT_CREATED");
                return (
                  <li
                    key={`${i}-${line.slice(0, 48)}`}
                    className={`border-l-[2px] py-2 pl-3 pr-2 mb-1 rounded-r-lg ${
                      isInc
                        ? "border-rose-500/80 bg-rose-950/25 text-zinc-200 animate-alert-blink"
                        : "border-zinc-700 bg-black/25 text-zinc-500"
                    }`}
                  >
                    {line}
                  </li>
                );
              })
            )}
          </ul>
        </section>
      </div>

      <footer className="rounded-xl border border-white/[0.04] bg-black/30 px-5 py-3 text-[10px] text-zinc-600 font-mono">
        ICDRRMO OPS · Command dashboard · Sidebar modules for incidents, GIS, dispatch, responders, weather, SMS,
        voice, barangays, analytics, audit, vehicles, evacuation, notifications, evidence, RBAC.
        {!hasMapboxToken() ? (
          <>
            {" "}
            · Mapbox basemap / heat layers: set <span className="text-zinc-500">NEXT_PUBLIC_MAPBOX_TOKEN</span> in{" "}
            <span className="text-zinc-500">.env.local</span>, then restart <span className="text-zinc-500">npm run dev</span>{" "}
            or rebuild the admin image.
          </>
        ) : null}
      </footer>
    </div>
  );
}
