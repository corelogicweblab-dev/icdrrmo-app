"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { EocUnifiedMap } from "@/components/eoc/eoc-unified-map";
import { EOC_MAP_BUILD } from "@/lib/eoc-map-layers";

/** Full-screen EOC GIS — replaces legacy dual Mapbox/Leaflet panels. Build id visible on map HUD. */
export default function OpsMapPage(): ReactElement {
  const { tokens } = useOpsSession();

  if (!tokens?.accessToken) {
    return (
      <p className="p-6 text-sm text-zinc-500">
        Sign in to open the command map.{" "}
        <Link href="/" className="text-orange-400 underline">
          Login
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-52px)] min-h-[560px] -m-3 lg:-m-5">
      <EocUnifiedMap mode="ops" accessToken={tokens.accessToken} layout="fullscreen" className="flex-1" />
      <p className="shrink-0 px-3 py-1 text-[9px] text-zinc-600 text-center">
        Deploy build <span className="font-mono text-zinc-500">{EOC_MAP_BUILD}</span> — if you still see the old
        dual-panel map, hard-refresh (Ctrl+F5) or wait for Firebase Hosting deploy.
      </p>
    </div>
  );
}
