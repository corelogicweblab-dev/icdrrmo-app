"use client";

import type { ReactElement } from "react";
import { ICDRRMO_LOGO_SRC } from "@/lib/branding";

type Props = {
  className?: string;
  /** Square edge length in CSS pixels */
  size?: number;
  /** Kept for API compatibility with previous `next/image` usage (no-op). */
  priority?: boolean;
};

/** Plain `<img>` so static export / Firebase hosting reliably loads `/icdrrmologo.png`. */
export function IcdrrmoLogo({ className = "", size = 56, priority: _priority = false }: Props): ReactElement {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ICDRRMO_LOGO_SRC}
      alt="ICDRRMO"
      width={size}
      height={size}
      className={`object-contain select-none ${className}`}
      decoding="async"
      fetchPriority={_priority ? "high" : "auto"}
    />
  );
}
