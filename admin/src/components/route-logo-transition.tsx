"use client";

import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { IcdrrmoLogo } from "@/components/icdrrmo-logo";

const OVERLAY_MS = 580;

/**
 * Brief centered logo flash on client-side route changes (SPA navigation).
 * Skips the first paint so the initial load is not covered.
 */
export function RouteLogoTransition(): ReactElement | null {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const skipFirst = useRef(true);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    setShow(true);
    const t = window.setTimeout(() => setShow(false), OVERLAY_MS);
    return () => window.clearTimeout(t);
  }, [pathname]);

  if (!show) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[500] flex items-center justify-center bg-[#040406]/45 backdrop-blur-[2px]"
      aria-hidden
    >
      <div
        key={pathname}
        className="icdrrmo-route-logo-overlay rounded-2xl border border-rose-500/35 bg-zinc-950/92 p-6 shadow-[0_0_48px_-10px_rgba(225,29,72,0.5)] ring-1 ring-white/10"
      >
        <IcdrrmoLogo size={96} priority className="select-none drop-shadow-[0_4px_28px_rgba(225,29,72,0.4)]" />
      </div>
    </div>
  );
}
