"use client";

import type { ReactElement } from "react";
import { GitBranch, MapPinned, SatelliteDish } from "lucide-react";
import { OpsPanelCard } from "@/components/ops/ops-widgets";

export default function OpsBarangaysPage(): ReactElement {
  return (
    <div className="p-4 lg:p-6 grid gap-4 md:grid-cols-2">
      <OpsPanelCard title="Barangay coordination" subtitle="Grassroots resource + escalation">
        <ul className="space-y-3 text-sm text-zinc-300">
          <li className="flex gap-3">
            <MapPinned className="h-5 w-5 text-rose-400 shrink-0" aria-hidden /> Barangay-focused incident subsets
          </li>
          <li className="flex gap-3">
            <GitBranch className="h-5 w-5 text-sky-400 shrink-0" aria-hidden /> Local coordinator roster + escalation tree
          </li>
          <li className="flex gap-3">
            <SatelliteDish className="h-5 w-5 text-emerald-400 shrink-0" aria-hidden /> Local broadcast templates + SMS fan-out
          </li>
        </ul>
      </OpsPanelCard>
      <OpsPanelCard title="Resource requests pipeline" subtitle="Barangay → city logistics desk">
        <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-500">
          Open requests table (PostgreSQL kanban board) plugs here — track food, gensets, med kits by barangay.
        </div>
      </OpsPanelCard>
    </div>
  );
}
