"use client";

import type { ReactElement } from "react";
import { CloudRain, Globe2, Layers, Radio, Waves, Wind } from "lucide-react";
import { WEATHER_SOURCES } from "@/components/ops/ops-nav";
import { OpsPanelCard } from "@/components/ops/ops-widgets";
import { ISABELA_EOC_LAT, ISABELA_EOC_LNG } from "@/lib/isabela-eoc";

/** RainViewer embed — same proven params as `/ops/map`; zoom 8 fits Mindanao / Zamboanga basin context. */
const WEATHER_MAP_SRC = `https://www.rainviewer.com/map.html?loc=${ISABELA_EOC_LAT},${ISABELA_EOC_LNG},8&oFa=0&oC=0&oU=0&oCS=1&oF=0&oAP=0&rmt=1&c=1&o=83&lm=0&th=0&sm=0&sn=1&lang=en`;

const LAYER_CHIPS = ["Radar", "Satellite", "Rain", "Clouds"] as const;

export default function OpsWeatherPage(): ReactElement {
  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#040406] shadow-[0_24px_80px_-40px_rgba(14,165,233,0.35)]">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] bg-gradient-to-r from-[#06080f] via-[#0a0c12] to-sky-950/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold tracking-tight text-white sm:text-base">Situational weather map</h1>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
              Pan and zoom inside the viewer. Use the <span className="text-zinc-400">timeline / playback</span>{" "}
              control along the bottom edge to scrub radar and forecasts — same interaction pattern as professional
              weather desks.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
            {LAYER_CHIPS.map((label) => (
              <span
                key={label}
                className="rounded-full border border-white/[0.08] bg-black/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative bg-black">
          <iframe
            title="Situational weather map"
            className="h-[min(72vh,820px)] w-full min-h-[440px] border-0"
            src={WEATHER_MAP_SRC}
            loading="lazy"
            allowFullScreen
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black via-black/70 to-transparent" aria-hidden />
          <div className="pointer-events-none absolute bottom-2 left-3 right-3 flex flex-col items-center gap-1 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-[10px] text-zinc-500">
              AOI center: <span className="font-mono text-zinc-400">{ISABELA_EOC_LAT.toFixed(3)}°N</span>
              <span className="mx-1 text-zinc-600">·</span>
              <span className="font-mono text-zinc-400">{ISABELA_EOC_LNG.toFixed(3)}°E</span>
            </p>
            <p className="text-[10px] text-zinc-600">Fullscreen: viewer corner menu or F11 on desktop</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-12">
        <OpsPanelCard title="Data integrations" className="lg:col-span-5">
          <div className="mb-6 flex flex-wrap gap-2">
            {WEATHER_SOURCES.map((s) => (
              <span
                key={s}
                className="rounded-lg border border-sky-500/25 bg-sky-950/30 px-2.5 py-1 text-[11px] text-sky-200"
              >
                {s}
              </span>
            ))}
          </div>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li className="flex items-center gap-2">
              <CloudRain className="h-4 w-4 shrink-0 text-sky-400" aria-hidden />
              Rainfall accumulation layers
            </li>
            <li className="flex items-center gap-2">
              <Wind className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              Tropical cyclone tracks · wind radii
            </li>
            <li className="flex items-center gap-2">
              <Globe2 className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
              Heat index grids + public health triggers
            </li>
            <li className="flex items-center gap-2">
              <Waves className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden />
              Tsunami / sea state (PHIVOLCS / NOAA feeds)
            </li>
            <li className="flex items-center gap-2">
              <Radio className="h-4 w-4 shrink-0 text-rose-400" aria-hidden />
              Push hazard bulletins → Notifications panel
            </li>
          </ul>
        </OpsPanelCard>

        <OpsPanelCard title="Using this map" subtitle="EOC workflow" className="lg:col-span-7">
          <ul className="space-y-3 text-sm leading-relaxed text-zinc-400">
            <li className="flex gap-3">
              <Layers className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" aria-hidden />
              <span>
                Open the <strong className="text-zinc-300">layer menu</strong> inside the embedded viewer to switch
                radar source, satellite, and storm tracks where available.
              </span>
            </li>
            <li className="flex gap-3">
              <Wind className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              <span>
                Cross-check severe weather with <strong className="text-zinc-300">PAGASA</strong> bulletins before
                dispatch decisions; embeds are advisory aids only.
              </span>
            </li>
          </ul>
        </OpsPanelCard>
      </div>
    </div>
  );
}
