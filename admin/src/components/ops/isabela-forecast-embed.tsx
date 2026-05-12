"use client";

import type { ReactElement } from "react";
import { useMemo } from "react";
import {
  ISABELA_CITY_LAT,
  ISABELA_CITY_LON,
  PH_SYNOPTIC_LAT,
  PH_SYNOPTIC_LON,
  PH_SYNOPTIC_ZOOM,
  isabelaForecastDeskEmbedUrl,
} from "@/lib/isabela-forecast-embed";

export type IsabelaForecastEmbedVariant = "compact" | "synoptic";

type Props = {
  variant: IsabelaForecastEmbedVariant;
  /** Overlay id accepted by the embed (e.g. wind, rain, temp). */
  overlay: string;
  /** Iframe title for accessibility (no vendor name). */
  title: string;
  className?: string;
  /** Pixels cropped from the bottom of the iframe (third-party chrome). */
  clipBottomPx?: number;
};

/**
 * Live forecast desk embed for Isabela / wider PH view. Bottom chrome is clipped and covered
 * so third-party branding stays out of sight in our chrome (layout may vary by provider).
 */
export function IsabelaForecastEmbed(props: Props): ReactElement {
  const clipB = props.clipBottomPx ?? (props.variant === "compact" ? 52 : 56);
  const src = useMemo(() => {
    if (props.variant === "compact") {
      return isabelaForecastDeskEmbedUrl({
        lat: ISABELA_CITY_LAT,
        lon: ISABELA_CITY_LON,
        zoom: 11,
        overlay: props.overlay,
        mode: "forecast",
        withDetail: true,
      });
    }
    return isabelaForecastDeskEmbedUrl({
      lat: PH_SYNOPTIC_LAT,
      lon: PH_SYNOPTIC_LON,
      zoom: PH_SYNOPTIC_ZOOM,
      overlay: props.overlay,
      mode: "map",
      withDetail: false,
    });
  }, [props.overlay, props.variant]);

  const frameHeight = props.variant === "compact" ? "min-h-[220px] h-[248px]" : "h-[min(72vh,820px)] w-full min-h-[440px]";

  return (
    <div className={`relative overflow-hidden rounded-xl bg-black ${props.className ?? ""}`}>
      <iframe
        key={src}
        title={props.title}
        className={`${frameHeight} w-full border-0`}
        style={{ clipPath: `inset(0 0 ${clipB}px 0)` }}
        src={src}
        loading="lazy"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#020208] via-[#020208]/90 to-transparent sm:h-20"
        aria-hidden
      />
    </div>
  );
}
