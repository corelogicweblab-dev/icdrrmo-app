"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { Layers, Wind } from "lucide-react";
import { WindyEmbedMap } from "@/components/windy-embed-map";
import { EocUnifiedMap } from "@/components/eoc/eoc-unified-map";

type MapView = "windy" | "hazards";

/** Citizen map: Windy forecast desk (default) + optional ICDRRMO hazard layers. */
export function CitizenWeatherMap(props: { accessToken: string }): ReactElement {
  const [view, setView] = useState<MapView>("windy");

  return (
    <div className="space-y-2">
      <div className="flex gap-1 rounded-lg bg-black/40 p-1">
        <button
          type="button"
          onClick={() => setView("windy")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-[10px] font-semibold uppercase tracking-wide ${
            view === "windy" ? "bg-orange-600/35 text-orange-50" : "text-zinc-500"
          }`}
        >
          <Wind className="h-3.5 w-3.5" aria-hidden />
          Live forecast (Windy)
        </button>
        <button
          type="button"
          onClick={() => setView("hazards")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-[10px] font-semibold uppercase tracking-wide ${
            view === "hazards" ? "bg-orange-600/35 text-orange-50" : "text-zinc-500"
          }`}
        >
          <Layers className="h-3.5 w-3.5" aria-hidden />
          GDACS · PAGASA · SOS
        </button>
      </div>

      {view === "windy" ? (
        <WindyEmbedMap variant="synoptic" overlay="wind" />
      ) : (
        <div className="rounded-2xl border border-orange-500/20 overflow-hidden h-[min(55dvh,520px)] flex flex-col">
          <EocUnifiedMap mode="citizen" accessToken={props.accessToken} className="flex-1 min-h-0" />
        </div>
      )}
    </div>
  );
}
