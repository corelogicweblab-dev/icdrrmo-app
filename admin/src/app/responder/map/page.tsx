"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { useResponderSession, isResponderRole } from "@/components/responder/responder-session-context";
import { EocLeafletMap } from "@/components/ops/eoc-leaflet-map";
import { OpsPanelCard } from "@/components/ops/ops-widgets";

export default function ResponderMapPage(): ReactElement {
  const { tokens } = useResponderSession();
  const access = tokens?.accessToken;
  const ok = access ? isResponderRole(access) : false;

  if (!access) {
    return (
      <div className="p-8 text-center text-sm text-zinc-400">
        <Link href="/signin/responder" className="text-sky-400 underline">
          Sign in
        </Link>{" "}
        to open the field map.
      </div>
    );
  }

  if (!ok) {
    return <p className="p-8 text-sm text-amber-200/90">Responder role required for this map.</p>;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <OpsPanelCard title="Responder map" subtitle="Barangay-scoped live layers · OSRM ETA">
        <EocLeafletMap accessToken={access} />
      </OpsPanelCard>
    </div>
  );
}
