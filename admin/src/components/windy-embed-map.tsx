"use client";

import type { ReactElement } from "react";
import { IsabelaWeatherDesk } from "@/components/ops/isabela-weather-desk";

type WindyOverlay = "wind" | "rain" | "temp" | "clouds" | "pressure";

type Props = {
  variant?: "synoptic" | "city";
  overlay?: WindyOverlay;
  title?: string;
  className?: string;
};

/**
 * @deprecated Windy embed iframe removed (third-party logo).
 * Use {@link IsabelaWeatherDesk} or {@link EocUnifiedMap} — Windy API tiles via ICDRRMO.
 */
export function WindyEmbedMap(props: Props): ReactElement {
  const variant = props.variant === "city" ? "compact" : "synoptic";
  return (
    <IsabelaWeatherDesk
      variant={variant}
      overlay={props.overlay ?? "wind"}
      title={props.title ?? "ICDRRMO live weather map"}
      className={props.className}
    />
  );
}
