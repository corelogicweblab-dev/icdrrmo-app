"use client";

import type { ReactElement } from "react";
import { useMemo } from "react";
import {
  ISABELA_CITY_LAT,
  ISABELA_CITY_LON,
  PH_SYNOPTIC_LAT,
  PH_SYNOPTIC_LON,
  PH_SYNOPTIC_ZOOM,
} from "@/lib/isabela-forecast-embed";

type WindyOverlay = "wind" | "rain" | "temp" | "clouds" | "pressure";

type Props = {
  /** Wider Sulu / Zamboanga / Basilan view (matches enterprise desk map). */
  variant?: "synoptic" | "city";
  overlay?: WindyOverlay;
  className?: string;
};

/** Full Windy forecast desk — live layers + timeline (embed.windy.com). */
export function WindyEmbedMap(props: Props): ReactElement {
  const variant = props.variant ?? "synoptic";
  const overlay = props.overlay ?? "wind";

  const src = useMemo(() => {
    const lat = variant === "synoptic" ? PH_SYNOPTIC_LAT : ISABELA_CITY_LAT;
    const lon = variant === "synoptic" ? PH_SYNOPTIC_LON : ISABELA_CITY_LON;
    const zoom = variant === "synoptic" ? PH_SYNOPTIC_ZOOM : 10;
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      detailLat: String(ISABELA_CITY_LAT),
      detailLon: String(ISABELA_CITY_LON),
      zoom: String(zoom),
      level: "surface",
      overlay,
      product: "ecmwf",
      menu: "",
      message: "true",
      marker: "true",
      calendar: "now",
      pressure: "false",
      type: "map",
      location: "coordinates",
      detail: "true",
      metricWind: "km/h",
      metricTemp: "°C",
      radarRange: "-1",
    });
    return `https://embed.windy.com/embed2.html?${params.toString()}`;
  }, [variant, overlay]);

  const heightClass =
    variant === "synoptic" ? "min-h-[min(72vh,720px)] h-[min(72vh,720px)]" : "min-h-[420px] h-[420px]";

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-orange-500/20 bg-[#0a1628] ${heightClass} ${props.className ?? ""}`}
    >
      <iframe
        title="Windy live weather — Isabela City & Sulu Sea"
        src={src}
        className="absolute inset-0 h-full w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allow="fullscreen"
      />
    </div>
  );
}
