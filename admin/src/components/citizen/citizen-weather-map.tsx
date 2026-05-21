"use client";

import type { ReactElement } from "react";
import { EocUnifiedMap } from "@/components/eoc/eoc-unified-map";

/**
 * Citizen weather map — Leaflet + Windy API tiles (Render WINDY_API_KEY).
 * No Windy.com embed iframe or Windy logo on screen.
 */
export function CitizenWeatherMap(props: { accessToken: string }): ReactElement {
  return (
    <div className="flex h-[min(72dvh,720px)] min-h-[360px] flex-col overflow-hidden rounded-2xl border border-orange-500/20">
      <p className="shrink-0 border-b border-orange-500/12 bg-black/50 px-3 py-2 text-[10px] text-zinc-400">
        <span className="font-semibold uppercase tracking-wider text-orange-400/90">
          Live weather layers
        </span>
        {" · "}
        Live weather · GDACS · PAGASA · hazard context
      </p>
      <EocUnifiedMap
        mode="citizen"
        accessToken={props.accessToken}
        layout="fullscreen"
        className="min-h-0 flex-1"
      />
    </div>
  );
}
