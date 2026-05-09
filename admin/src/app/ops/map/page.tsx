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
import { incidentsToMapPins } from "@/lib/map-pins";
import { OpsPanelCard } from "@/components/ops/ops-widgets";
import { useOpsSession } from "@/components/ops/ops-session-context";

const LAYER_GROUPS = [
  {
    title: "Positions",
    items: ["Live citizens", "Live responders", "Ambulance / rescue units", "Vehicle tracking"],
  },
  {
    title: "Incidents & analysis",
    items: ["Incident markers", "Incident clusters", "Heatmaps", "Historical density"],
  },
  {
    title: "Hazard overlays",
    items: ["Flood-prone zones", "Landslide polygons", "Earthquake shake", "Typhoon cones"],
  },
  {
    title: "Operational overlays",
    items: ["Barangay boundaries", "Evacuation centers", "Heavy traffic / closures", "Weather radar"],
  },
];

export default function OpsMapPage(): ReactElement {
  const { queue } = useOpsSession();
  const [layers, setLayers] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      LAYER_GROUPS.flatMap((g) => g.items.map((i) => [i, i === "Incident markers"])),
    ),
  );

  const mapPins = useMemo(() => incidentsToMapPins(queue), [queue]);
  const markers = mapPins.length;

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-140px)] gap-3 p-3 lg:p-5">
      <aside className="lg:w-80 shrink-0 space-y-3 overflow-y-auto scroll-ops max-h-[40vh] lg:max-h-none">
        <OpsPanelCard title="Layer control" subtitle={`${markers} incidents with coordinates in queue`}>
          <div className="space-y-4 -m-1">
            {LAYER_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 px-1 mb-2">
                  {group.title}
                </p>
                <ul className="space-y-1.5">
                  {group.items.map((item) => (
                    <li key={item}>
                      <label className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-white/[0.04]">
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
            <p className="text-[10px] text-zinc-600 leading-relaxed px-1 pt-2 border-t border-white/[0.06]">
              Mapbox GL + custom vector tiles. Enable NEXT_PUBLIC_MAPBOX_TOKEN. Tie toggles to map style sources in a
              follow-up PR.
            </p>
          </div>
        </OpsPanelCard>
        <OpsPanelCard title="Legend" subtitle="GIS panel quick reference">
          <ul className="text-[11px] text-zinc-400 space-y-2">
            <li className="flex items-center gap-2">
              <LocateFixed className="h-4 w-4 text-rose-400" aria-hidden />
              SOS / incident
            </li>
            <li className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-sky-400" aria-hidden />
              Field unit
            </li>
            <li className="flex items-center gap-2">
              <Waves className="h-4 w-4 text-cyan-400" aria-hidden />
              Flood layer
            </li>
            <li className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-400" aria-hidden />
              Fire / HAZMAT
            </li>
            <li className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-emerald-400" aria-hidden />
              Wind / typhoon
            </li>
            <li className="flex items-center gap-2">
              <Home className="h-4 w-4 text-violet-400" aria-hidden />
              Evacuation shelter
            </li>
            <li className="flex items-center gap-2">
              <Route className="h-4 w-4 text-zinc-400" aria-hidden />
              Routing / ETA
            </li>
          </ul>
        </OpsPanelCard>
      </aside>
      <section className="flex-1 flex flex-col rounded-2xl border border-white/[0.06] bg-zinc-950/50 shadow-panel min-h-[420px] lg:min-h-[calc(100vh-156px)] overflow-hidden">
        <div className="flex items-center justify-between shrink-0 border-b border-white/[0.06] px-4 py-3 bg-black/30">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Radar className="h-4 w-4 text-rose-400" aria-hidden />
            Realtime GIS — Isabela City AOI
          </div>
          <Layers className="h-5 w-5 text-zinc-600" aria-hidden />
        </div>
        <SituationMap incidentPins={mapPins} />
      </section>
    </div>
  );
}
