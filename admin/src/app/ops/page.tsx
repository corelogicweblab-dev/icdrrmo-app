"use client";

import type { ReactElement } from "react";
import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  CloudRain,
  Home,
  Map,
  Radar,
  Radio,
  ShieldAlert,
  Siren,
  Users,
  Waves,
} from "lucide-react";
import { getHealthCheckUrl, hasMapboxToken } from "@/lib/env";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { formatOpsSync, incidentBorderClass, statusBadgeClass } from "@/components/ops/ops-format";
import type { OpsIncident } from "@/components/ops/ops-types";
import { OpsKpiCard, OpsPanelCard } from "@/components/ops/ops-widgets";
import { SituationMap } from "@/components/situation-map";
import { incidentsToMapPins } from "@/lib/map-pins";

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

  const mockHourlyIncidents = [2, 4, 3, 6, 8, 5, 11, openCount || 7, 4, 6, 3, 2];
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
        <div className="ml-auto flex gap-6 text-[11px] text-zinc-400">
          <span>
            <span className="text-zinc-500">Responders online (sim)</span>
            <span className="ml-2 font-mono text-emerald-300">{Math.min(42, 28 + openCount * 3)}</span>
          </span>
          <span>
            <span className="text-zinc-500">Weather advisory</span>
            <span className="ml-2 text-amber-200">TS signal · monitor PAGASA</span>
          </span>
          <span>
            <span className="text-zinc-500">Flood / hazard</span>
            <span className="ml-2 text-sky-200">{openCount > 5 ? "2 barangays on watch" : "Stable"}</span>
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
        <OpsPanelCard title="Weather alerts" subtitle="PAGASA · OpenWeather · RainViewer (wire API keys)">
          <ul className="space-y-2 text-xs text-zinc-400">
            <li className="flex items-center gap-2">
              <CloudRain className="h-4 w-4 text-sky-400 shrink-0" aria-hidden />
              Heavy rainfall watch — western Basilan · next 6h
            </li>
            <li className="flex items-center gap-2">
              <Waves className="h-4 w-4 text-cyan-400 shrink-0" aria-hidden />
              Coastal surge advisory — moderate
            </li>
          </ul>
        </OpsPanelCard>
        <OpsPanelCard title="Flood & hazard" subtitle="GIS overlays / PHIVOLCS">
          <ul className="space-y-2 text-xs text-zinc-400">
            <li className="flex gap-2">
              <span className="font-mono text-[10px] text-amber-400">FLOOD</span>
              Low-lying drain stress — Isabela proper
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-[10px] text-orange-400">LS</span>
              Landslide watch — eastern upland routes
            </li>
          </ul>
        </OpsPanelCard>
        <OpsPanelCard title="Active evacuations" subtitle="Centers + occupancy (integrate DB)">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-zinc-300">
              <Home className="h-4 w-4 text-emerald-400" aria-hidden />
              Grandstand · Sports complex
            </span>
            <span className="font-mono text-zinc-500">142 / 850</span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full w-[17%] rounded-full bg-emerald-500/60" />
          </div>
        </OpsPanelCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <OpsPanelCard
          title="Incident counters / hour (simulated trend)"
          subtitle="Replace with Postgres time-series / analytics pipeline"
          className="xl:col-span-4"
        >
          <SparkBars values={mockHourlyIncidents} color="bg-emerald-500/60" />
        </OpsPanelCard>
        <OpsPanelCard title="Median dispatch latency (min · sim)" subtitle="Rolling window analytics" className="xl:col-span-4">
          <SparkBars values={mockDispatchLatency.map((x) => 20 - x)} color="bg-sky-500/55" />
        </OpsPanelCard>
        <OpsPanelCard
          title="System health summary"
          subtitle="Deep dive · System Health panel"
          className="xl:col-span-4"
        >
          <ul className="text-[11px] text-zinc-400 space-y-1.5">
            <li>API / Nest — {apiReachable ? "responding" : "check"}</li>
            <li>Redis / BullMQ — workers (confirm env)</li>
            <li>SMS modem / gateway — see SMS panel</li>
            <li>WebRTC / voice — standby</li>
          </ul>
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
