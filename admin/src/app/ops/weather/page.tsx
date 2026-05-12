"use client";

import type { ReactElement } from "react";
import { CloudRain, Globe2, Layers, Radio, Waves, Wind } from "lucide-react";
import { WEATHER_SOURCES } from "@/components/ops/ops-nav";
import { OpsPanelCard } from "@/components/ops/ops-widgets";
import { ISABELA_EOC_LAT, ISABELA_EOC_LNG } from "@/lib/isabela-eoc";

/** RainViewer embed — same proven params as `/ops/map`; zoom 8 fits Mindanao / Zamboanga basin context. */
const WEATHER_MAP_SRC = `https://www.rainviewer.com/map.html?loc=${ISABELA_EOC_LAT},${ISABELA_EOC_LNG},8&oFa=0&oC=0&oU=0&oCS=1&oF=0&oAP=0&rmt=1&c=1&o=83&lm=0&th=0&sm=0&sn=1&lang=en`;

/**
 * Windy-style layer strip — all shown as **active** (EOC reference; tune layers inside the embedded viewer).
 * Colours echo common desk maps (radar green, IR violet, wind cyan, etc.).
 */
const ACTIVE_LAYER_STRIP: ReadonlyArray<{
  label: string;
  hint: string;
  ring: string;
  bg: string;
  dot: string;
  glow: string;
}> = [
  {
    label: "Radar",
    hint: "Composite",
    ring: "ring-emerald-400/75",
    bg: "from-emerald-500/35 via-emerald-950/70 to-black",
    dot: "bg-emerald-400",
    glow: "shadow-[0_0_12px_rgba(52,211,153,0.45)]",
  },
  {
    label: "Satellite",
    hint: "IR / visible",
    ring: "ring-violet-400/70",
    bg: "from-violet-500/30 via-violet-950/70 to-black",
    dot: "bg-violet-400",
    glow: "shadow-[0_0_12px_rgba(167,139,250,0.35)]",
  },
  {
    label: "Rain & thunder",
    hint: "Cells",
    ring: "ring-sky-400/75",
    bg: "from-sky-500/35 via-sky-950/75 to-black",
    dot: "bg-sky-400",
    glow: "shadow-[0_0_12px_rgba(56,189,248,0.4)]",
  },
  {
    label: "Clouds",
    hint: "Cover",
    ring: "ring-slate-300/50",
    bg: "from-slate-500/25 via-slate-900/80 to-black",
    dot: "bg-slate-200",
    glow: "shadow-[0_0_10px_rgba(226,232,240,0.2)]",
  },
  {
    label: "Wind",
    hint: "10 m",
    ring: "ring-cyan-400/70",
    bg: "from-cyan-500/30 via-cyan-950/75 to-black",
    dot: "bg-cyan-400",
    glow: "shadow-[0_0_12px_rgba(34,211,238,0.35)]",
  },
  {
    label: "Temperature",
    hint: "2 m",
    ring: "ring-amber-400/70",
    bg: "from-amber-500/30 via-amber-950/70 to-black",
    dot: "bg-amber-400",
    glow: "shadow-[0_0_12px_rgba(251,191,36,0.3)]",
  },
  {
    label: "Waves",
    hint: "Swell",
    ring: "ring-blue-400/65",
    bg: "from-blue-600/30 via-blue-950/75 to-black",
    dot: "bg-blue-400",
    glow: "shadow-[0_0_12px_rgba(96,165,250,0.35)]",
  },
  {
    label: "Pressure",
    hint: "MSL",
    ring: "ring-rose-400/60",
    bg: "from-rose-500/25 via-rose-950/75 to-black",
    dot: "bg-rose-400",
    glow: "shadow-[0_0_10px_rgba(251,113,133,0.3)]",
  },
  {
    label: "Lightning",
    hint: "Density",
    ring: "ring-yellow-400/75",
    bg: "from-yellow-500/25 via-yellow-950/60 to-black",
    dot: "bg-yellow-300",
    glow: "shadow-[0_0_14px_rgba(253,224,71,0.35)]",
  },
  {
    label: "Forecast",
    hint: "Timeline",
    ring: "ring-fuchsia-400/65",
    bg: "from-fuchsia-600/28 via-fuchsia-950/75 to-black",
    dot: "bg-fuchsia-400",
    glow: "shadow-[0_0_12px_rgba(232,121,249,0.32)]",
  },
];

function ActiveLayerPill(props: (typeof ACTIVE_LAYER_STRIP)[number]): ReactElement {
  const { label, hint, ring, bg, dot, glow } = props;
  return (
    <div
      className={`relative flex min-w-[7.25rem] max-w-[9.5rem] flex-1 flex-col gap-0.5 rounded-xl bg-gradient-to-br ${bg} px-2.5 py-2 ring-2 ring-inset ${ring} ${glow}`}
      role="status"
      aria-label={`${label} layer reference active`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
          <span className={`h-2 w-2 shrink-0 rounded-full ${dot} ring-1 ring-white/30`} aria-hidden />
          {label}
        </span>
        <span className="shrink-0 rounded border border-white/25 bg-white/15 px-1 py-px text-[8px] font-bold uppercase tracking-wide text-white">
          On
        </span>
      </div>
      <span className="pl-3.5 text-[9px] font-medium leading-tight text-white/75">{hint}</span>
    </div>
  );
}

export default function OpsWeatherPage(): ReactElement {
  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#040406] shadow-[0_24px_80px_-40px_rgba(14,165,233,0.35)]">
        <div className="border-b border-white/[0.06] bg-gradient-to-r from-[#06080f] via-[#0a0c12] to-sky-950/25 px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-sm font-semibold tracking-tight text-white sm:text-base">Situational weather map</h1>
              <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-zinc-500">
                Pan and zoom inside the viewer. Use the <span className="text-zinc-400">timeline / playback</span> bar
                at the bottom of the map to scrub time. Strip below lists standard desk layers —{" "}
                <span className="text-zinc-400">toggle the real layers inside the embedded viewer</span>.
              </p>
            </div>
            <p className="shrink-0 rounded-lg border border-emerald-500/35 bg-emerald-950/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-200/95">
              All layers · live reference
            </p>
          </div>

          <div
            className="mt-3 flex flex-wrap gap-2"
            role="list"
            aria-label="Weather layer categories shown as active on the EOC desk"
          >
            {ACTIVE_LAYER_STRIP.map((layer) => (
              <div key={layer.label} className="min-w-[calc(50%-0.25rem)] flex-1 sm:min-w-[7.25rem] sm:flex-none">
                <ActiveLayerPill {...layer} />
              </div>
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
                className="rounded-lg border border-sky-400/40 bg-gradient-to-br from-sky-500/25 to-sky-950/60 px-2.5 py-1 text-[11px] font-semibold text-sky-100 ring-1 ring-inset ring-sky-400/30"
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
                The strip above mirrors a <strong className="text-zinc-300">full desk legend</strong> (all
                categories highlighted for briefing). Actual layer on/off is controlled{" "}
                <strong className="text-zinc-300">inside the map viewer</strong>.
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
