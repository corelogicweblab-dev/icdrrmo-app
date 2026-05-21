"use client";

import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { IcdrrmoLogo } from "@/components/icdrrmo-logo";

const OVERLAY_MS = 420;

export function RouteLogoTransition(): ReactElement | null {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const skipFirst = useRef(true);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    /* Auth home uses IcdAuthShell — route overlay reads as flicker on top of logo pulse. */
    if (pathname === "/" || pathname === "/signin") return;
    setShow(true);
    const t = window.setTimeout(() => setShow(false), OVERLAY_MS);
    return () => window.clearTimeout(t);
  }, [pathname]);

  if (!show) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[35] flex items-center justify-center bg-black/25"
      aria-hidden
    >
      <div
        key={pathname}
        className="icdrrmo-route-logo-overlay rounded-2xl border border-orange-500/40 bg-black/95 p-6 shadow-glow ring-1 ring-orange-500/25"
      >
        <IcdrrmoLogo size={88} priority className="select-none drop-shadow-[0_4px_28px_rgba(249,115,22,0.5)]" />
      </div>
    </div>
  );
}
