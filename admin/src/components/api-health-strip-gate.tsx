"use client";

import type { ReactElement } from "react";
import { usePathname } from "next/navigation";
import { ApiHealthStrip } from "@/components/api-health-strip";

/** Hide the global API strip on sign-in — avoids duplicate timeout banners with the login form. */
function shouldHideApiHealthStrip(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/" || pathname === "/signin") return true;
  if (pathname.startsWith("/portals")) return true;
  if (pathname.startsWith("/citizen")) return true;
  if (pathname.startsWith("/responder")) return true;
  if (pathname.startsWith("/chairman")) return true;
  return false;
}

export function ApiHealthStripGate(): ReactElement | null {
  const pathname = usePathname();
  if (shouldHideApiHealthStrip(pathname)) return null;
  return <ApiHealthStrip />;
}
