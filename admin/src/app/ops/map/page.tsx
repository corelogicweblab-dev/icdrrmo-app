"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import {
  Flame,
  Home,
  Layers,
  LocateFixed,
  Radar,
  Route,
  Truck,
  Waves,
  Wind,
} from "lucide-react";
import { SituationMap } from "@/components/situation-map";
import { formatOpsSync } from "@/components/ops/ops-format";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { hasMapboxToken } from "@/lib/env";
import { defaultOpsMapLayerToggles, OPS_MAP_LAYER_GROUPS } from "@/lib/ops-map-layer-groups";
import { incidentsToMapPins } from "@/lib/map-pins";
import { OpsPanelCard } from "@/components/ops/ops-widgets";

export default function OpsMapPage(): ReactElement {
  const { queue, lastQueueSync, socketState } = useOpsSession();
  const [layers, setLayers] = useState<Record<string, boolean>>(defaultOpsMapLayerToggles);

  const mapPins = useMemo(() => incidentsToMapPins(queue), [queue]);
  const markers = mapPins.length;
  const withCoords = queue.filter((r) => r.latitude != null && r.longitude != null).length;

  const socketLabel =
    socketState === "live" ? "Socket live" : socketState === "error" ? "Socket fault" : "Socket standby";
  const syncLabel = lastQueueSync ? `Synced ${formatOpsSync(lastQueueSync)}` : "Awaiting first sync";

  return (
    <div className="flex min-h-[calc(100vh-140px)] flex-col gap-3 p-3 lg:flex-row lg:p-5">
      <aside className="max-h-[40vh] shrink-0 space-y-3 overflow-y-auto scroll-ops lg:max-h-none lg:w-80">
        <OpsPanelCard
          title="Layer control"
          subtitle={`${markers} plotted · ${withCoords}/${queue.length} with coordinates · ${syncLabel} · ${socketLabel}`}
        >
          <div className="-m-1 space-y-4">
            {OPS_MAP_LAYER_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                  {group.title}
                </p>
                <ul className="space-y-1.5">
                  {group.items.map((item) => (
                    <li key={item}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.04]">
                        <input
                          type="checkbox"
                          checked={layers[item] ?? false}
                          onChange={(e) =>
                            setLayers((prev) => ({
                              ...prev,
                              [item]: e.target.checked,
                            }))
                          }
                          className="rounded border-zinc-600 bg-black/50 text-rose-600 focus:ring-rose-500/40"
                        />
                        <span className="text-[12px] text-zinc-300">{item}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="border-t border-white/[0.06] px-1 pt-2 text-[10px] leading-relaxed text-zinc-600">
              Toggles update the Mapbox style in real time. Incident heatmap / clusters use the same ops queue as the
              command dashboard. Positions and hazard overlays are wired (visibility + GeoJSON sources); populate feeds
              from the API when ready.
              {!hasMapboxToken()
                ? " Add NEXT_PUBLIC_MAPBOX_TOKEN in .env.local and restart the dev server."
                : null}
            </p>
          </div>
        </OpsPanelCard>
        <OpsPanelCard title="Legend" subtitle="GIS panel quick reference">
          <ul className="space-y-2 text-[11px] text-zinc-400">
            <li className="flex items-center gap-2">
              <LocateFixed className="h-4 w-4 shrink-0 text-rose-400" aria-hidden />
              SOS / incident
            </li>
            <li className="flex items-center gap-2">
              <Truck className="h-4 w-4 shrink-0 text-sky-400" aria-hidden />
              Field unit
            </li>
            <li className="flex items-center gap-2">
              <Waves className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden />
              Flood layer
            </li>
            <li className="flex items-center gap-2">
              <Flame className="h-4 w-4 shrink-0 text-orange-400" aria-hidden />
              Fire / HAZMAT
            </li>
            <li className="flex items-center gap-2">
              <Wind className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              Wind / typhoon
            </li>
            <li className="flex items-center gap-2">
              <Home className="h-4 w-4 shrink-0 text-violet-400" aria-hidden />
              Evacuation shelter
            </li>
            <li className="flex items-center gap-2">
              <Route className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
              Routing / ETA
            </li>
          </ul>
        </OpsPanelCard>
      </aside>
      <section className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-zinc-950/50 shadow-panel lg:min-h-[calc(100vh-156px)]">
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] bg-black/30 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Radar className="h-4 w-4 text-rose-400" aria-hidden />
            Realtime GIS — Isabela City AOI
          </div>
          <Layers className="h-5 w-5 text-zinc-600" aria-hidden />
        </div>
        <div className="min-h-0 w-full flex-1">
          <SituationMap incidentPins={mapPins} layerToggles={layers} />
        </div>
      </section>
    </div>
  );
}
