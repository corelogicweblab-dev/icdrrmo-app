"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { CloudRain, Globe2, Layers, Radio, Waves, Wind } from "lucide-react";
import { WEATHER_SOURCES } from "@/components/ops/ops-nav";
import { OpsPanelCard } from "@/components/ops/ops-widgets";
import { ISABELA_EOC_LAT, ISABELA_EOC_LNG } from "@/lib/isabela-eoc";

/**
 * Synoptic framing over the Philippines (Basilan / Isabela still in view); operators pan/zoom in the embed.
 * Windy requires decimal lat/lon in the embed URL.
 */
const VIEW_LAT = 12.25;
const VIEW_LNG = 122.25;
const VIEW_ZOOM = 6;

/** Windy embed — animated particles (wind), temp field, city labels, etc. Logo must remain visible per Windy terms. */
function windyEmbedSrc(overlay: string): string {
  const q = new URLSearchParams({
    lat: String(VIEW_LAT),
    lon: String(VIEW_LNG),
    zoom: String(VIEW_ZOOM),
    level: "surface",
    overlay,
    menu: "",
    message: "",
    marker: "",
    calendar: "now",
    pressure: "",
    type: "map",
    location: "coordinates",
    detail: "",
    metricWind: "kmh",
    metricTemp: "default",
    radarRange: "-1",
  });
  return `https://embed.windy.com/embed2.html?${q.toString()}`;
}

/**
 * Windy `overlay` values (documented: wind, temp, pressure, clouds, rh, gust, rain, lclouds, waves, …).
 * Radar stays under the embed’s own menu; mosaic playback stays on Ops → Map (RainViewer).
 */
const EMBED_OVERLAYS = [
  { id: "wind", label: "Wind", hint: "Particles + speed scale" },
  { id: "temp", label: "Temperature", hint: "City °C labels" },
  { id: "rain", label: "Rain", hint: "3h accumulation" },
  { id: "clouds", label: "Clouds", hint: "Total cover" },
  { id: "lclouds", label: "Low clouds", hint: "Fog / ceiling" },
  { id: "pressure", label: "Pressure", hint: "MSL isobars" },
  { id: "waves", label: "Waves", hint: "Swell height" },
  { id: "gust", label: "Gusts", hint: "Peak wind" },
] as const;

type OverlayId = (typeof EMBED_OVERLAYS)[number]["id"];

export default function OpsWeatherPage(): ReactElement {
  const [overlay, setOverlay] = useState<OverlayId>("wind");
  const iframeSrc = useMemo(() => windyEmbedSrc(overlay), [overlay]);

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#040406] shadow-[0_24px_80px_-40px_rgba(14,165,233,0.35)]">
        <div className="border-b border-white/[0.06] bg-gradient-to-r from-[#06080f] via-[#0a0c12] to-sky-950/25 px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-sm font-semibold tracking-tight text-white sm:text-base">Situational weather map</h1>
              <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-zinc-500">
                Live forecast map with wind motion, temperature fields, and place labels — same class of view as
                professional desk tools. Use the{" "}
                <span className="text-zinc-400">timeline and right-hand menus inside the map</span> for time and
                altitude. Tabs below switch the <span className="text-zinc-400">main overlay</span> (reloads the
                viewer).
              </p>
            </div>
            <p className="shrink-0 rounded-lg border border-sky-500/35 bg-sky-950/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-sky-200/95">
              Live embed · overlay tabs
            </p>
          </div>

          <div
            className="mt-3 flex flex-wrap gap-1.5"
            role="tablist"
            aria-label="Forecast map overlay"
          >
            {EMBED_OVERLAYS.map((o) => {
              const active = overlay === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setOverlay(o.id)}
                  className={
                    active
                      ? "min-h-[2.5rem] rounded-xl border border-cyan-400/50 bg-gradient-to-br from-cyan-500/25 via-cyan-950/50 to-black px-3 py-1.5 text-left ring-2 ring-cyan-400/40 shadow-[0_0_14px_rgba(34,211,238,0.25)]"
                      : "min-h-[2.5rem] rounded-xl border border-white/[0.08] bg-zinc-900/40 px-3 py-1.5 text-left text-zinc-400 hover:border-white/15 hover:bg-zinc-800/50 hover:text-zinc-200"
                  }
                >
                  <span className="block text-[11px] font-semibold text-white">{o.label}</span>
                  <span className="block text-[9px] font-medium leading-tight text-zinc-500">{o.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative bg-black">
          <iframe
            key={overlay}
            title="Situational weather map"
            className="h-[min(72vh,820px)] w-full min-h-[440px] border-0"
            src={iframeSrc}
            loading="lazy"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black via-black/70 to-transparent" aria-hidden />
          <div className="pointer-events-none absolute bottom-2 left-3 right-3 flex flex-col items-center gap-1 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-[10px] text-zinc-500">
              Default view: <span className="text-zinc-400">{VIEW_LAT.toFixed(2)}°N</span>
              <span className="mx-1 text-zinc-600">·</span>
              <span className="text-zinc-400">{VIEW_LNG.toFixed(2)}°E</span>
              <span className="mx-1 text-zinc-600">·</span>
              zoom {VIEW_ZOOM}
              <span className="mx-1 text-zinc-600">·</span>
              EOC pin{" "}
              <span className="font-mono text-zinc-400">
                {ISABELA_EOC_LAT.toFixed(3)}°N {ISABELA_EOC_LNG.toFixed(3)}°E
              </span>
            </p>
            <p className="text-[10px] text-zinc-600">
              Map data © OpenStreetMap — forecast visualization via embed provider (not PAGASA official product).
            </p>
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
                <strong className="text-zinc-300">RainViewer</strong> on <strong className="text-zinc-300">Ops → Map</strong>{" "}
                stays tuned for <strong className="text-zinc-300">radar mosaic</strong> and cell playback. This page
                uses a <strong className="text-zinc-300">forecast desk embed</strong> so you get wind particles,
                temperature shading, and city readouts similar to national briefing maps.
              </span>
            </li>
            <li className="flex gap-3">
              <Wind className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              <span>
                Cross-check severe weather with <strong className="text-zinc-300">PAGASA</strong> bulletins before
                dispatch decisions; any third-party map is an advisory aid only.
              </span>
            </li>
          </ul>
        </OpsPanelCard>
      </div>
    </div>
  );
}
