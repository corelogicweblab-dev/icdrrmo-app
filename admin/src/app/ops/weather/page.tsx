"use client";

import type { ReactElement } from "react";
import { CloudRain, Globe2, Radio, Waves, Wind } from "lucide-react";
import { WEATHER_SOURCES } from "@/components/ops/ops-nav";
import { OpsPanelCard } from "@/components/ops/ops-widgets";

export default function OpsWeatherPage(): ReactElement {
  return (
    <div className="p-4 lg:p-6 grid gap-4 lg:grid-cols-12">
      <OpsPanelCard title="Data integrations" className="lg:col-span-5">
        <div className="flex flex-wrap gap-2 mb-6">
          {WEATHER_SOURCES.map((s) => (
            <span key={s} className="rounded-lg border border-sky-500/25 bg-sky-950/30 px-2.5 py-1 text-[11px] text-sky-200">
              {s}
            </span>
          ))}
        </div>
        <ul className="space-y-2 text-sm text-zinc-400">
          <li className="flex items-center gap-2">
            <CloudRain className="h-4 w-4 text-sky-400" aria-hidden />
            Rainfall accumulation layers
          </li>
          <li className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-emerald-400" aria-hidden />
            Tropical cyclone tracks · wind radii
          </li>
          <li className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-amber-400" aria-hidden />
            Heat index grids + public health triggers
          </li>
          <li className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-cyan-400" aria-hidden />
            Tsunami / sea state (PHIVOLCS / NOAA feeds)
          </li>
          <li className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-rose-400" aria-hidden />
            Push hazard bulletins → Notifications panel
          </li>
        </ul>
      </OpsPanelCard>
      <OpsPanelCard title="Display tiles" subtitle="Radar · satellite · tiles via RainViewer + Mapbox" className="lg:col-span-7">
        <div className="aspect-video rounded-xl border border-white/[0.06] bg-gradient-to-br from-sky-950/40 via-zinc-950 to-black flex items-center justify-center text-zinc-600 text-sm font-mono">
          Weather composite viewport (embed RainViewer iframe or GL layer)
        </div>
      </OpsPanelCard>
    </div>
  );
}
