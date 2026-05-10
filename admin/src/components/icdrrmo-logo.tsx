"use client";

import type { ReactElement } from "react";
import Image from "next/image";
import { ICDRRMO_LOGO_SRC } from "@/lib/branding";

type Props = {
  className?: string;
  /** Square edge length in CSS pixels */
  size?: number;
  priority?: boolean;
};

export function IcdrrmoLogo({ className = "", size = 56, priority = false }: Props): ReactElement {
  return (
    <Image
      src={ICDRRMO_LOGO_SRC}
      alt="ICDRRMO"
      width={size}
      height={size}
      className={`object-contain select-none ${className}`}
      priority={priority}
      sizes={`${size}px`}
    />
  );
}
