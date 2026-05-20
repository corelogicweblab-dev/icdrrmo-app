"use client";

import type { ReactElement } from "react";
import { Radar } from "lucide-react";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { EocUnifiedMap } from "@/components/eoc/eoc-unified-map";
import { MapDispatchPanel } from "@/components/ops/map-dispatch-panel";

export default function OpsMapPage(): ReactElement {
  const { tokens } = useOpsSession();

  return (
    <div className="flex flex-col gap-4 p-3 lg:p-5">
      <header className="flex items-center gap-2 text-sm font-semibold text-white">
        <Radar className="h-4 w-4 text-rose-400" aria-hidden />
        EOC GIS — Isabela City · weather overlays · PAGASA · live shelters
      </header>
      <EocUnifiedMap mode="ops" accessToken={tokens?.accessToken} />
      <MapDispatchPanel />
    </div>
  );
}
