"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { CloudRain, Map } from "lucide-react";
import { EocUnifiedMap } from "@/components/eoc/eoc-unified-map";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { WEATHER_SOURCES } from "@/components/ops/ops-nav";
import { OpsPanelCard } from "@/components/ops/ops-widgets";

/** Same unified GIS as Ops → Map: OWM tiles + GDACS + PAGASA GeoJSON on one Leaflet desk. */
export default function OpsWeatherPage(): ReactElement {
  const { tokens } = useOpsSession();

  if (!tokens?.accessToken) {
    return (
      <p className="p-6 text-sm text-zinc-500">
        Sign in to open the weather map.{" "}
        <Link href="/" className="text-orange-400 underline">
          Login
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-3 lg:p-4 h-[calc(100dvh-52px)] min-h-[560px]">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-semibold text-white">Unified hazard & weather map</h1>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Windy API tiles (ICDRRMO) · GDACS · PAGASA — no third-party map logo
          </p>
        </div>
        <Link
          href="/ops/map"
          className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/35 bg-orange-950/40 px-3 py-1.5 text-[11px] text-orange-100 hover:bg-orange-950/60"
        >
          <Map className="h-3.5 w-3.5" aria-hidden />
          Ops realtime map
        </Link>
      </div>

      <EocUnifiedMap
        mode="ops"
        accessToken={tokens.accessToken}
        layout="fullscreen"
        className="flex-1 min-h-0"
      />

      <div className="shrink-0 grid gap-3 sm:grid-cols-2">
        <OpsPanelCard title="Active sources">
          <div className="flex flex-wrap gap-2">
            {WEATHER_SOURCES.map((s) => (
              <span
                key={s}
                className="rounded-lg border border-orange-400/40 bg-orange-950/50 px-2 py-0.5 text-[10px] font-semibold text-orange-100"
              >
                {s}
              </span>
            ))}
            <span className="rounded-lg border border-amber-400/40 bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
              GDACS
            </span>
          </div>
        </OpsPanelCard>
        <OpsPanelCard title="Desk note">
          <p className="text-[11px] text-zinc-500 leading-relaxed flex gap-2">
            <CloudRain className="h-4 w-4 shrink-0 text-sky-400" aria-hidden />
            Cross-check PAGASA official bulletins before dispatch. Live weather tiles require{" "}
            <code className="text-zinc-400">WINDY_API_KEY</code> on the API service (Render).
          </p>
        </OpsPanelCard>
      </div>
    </div>
  );
}
