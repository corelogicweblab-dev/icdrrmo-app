"use client";

import type { ReactElement } from "react";
import { GitBranch, List, MapPinned, SatelliteDish } from "lucide-react";
import { OpsPanelCard } from "@/components/ops/ops-widgets";
import {
  ISABELA_CITY_OFFICIAL_BARANGAYS,
  ISABELA_CITY_OFFICIAL_BARANGAY_COUNT,
} from "@/lib/isabela-official-barangays";

export default function OpsBarangaysPage(): ReactElement {
  return (
    <div className="p-4 lg:p-6 grid gap-4 lg:grid-cols-2">
      <OpsPanelCard
        title="Isabela City — official barangays"
        subtitle={`${ISABELA_CITY_OFFICIAL_BARANGAY_COUNT} barangays (reference list for EOC coordination)`}
        className="lg:col-span-2"
      >
        <p className="mb-4 text-xs leading-relaxed text-zinc-500">
          Use this list for planning, dispatch, and operator barangay assignment. Authoritative names and IDs for
          profiles and maps come from the live barangay directory in the emergency services database.
        </p>
        <ul className="grid gap-1.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 text-[13px] text-zinc-300">
          {ISABELA_CITY_OFFICIAL_BARANGAYS.map((name, i) => (
            <li key={name} className="flex min-w-0 gap-2 rounded-md border border-white/[0.04] bg-black/20 px-2 py-1.5">
              <span className="shrink-0 font-mono text-[10px] text-zinc-600 tabular-nums">{i + 1}.</span>
              <span className="truncate" title={name}>
                {name}
              </span>
            </li>
          ))}
        </ul>
      </OpsPanelCard>

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
          <li className="flex gap-3">
            <List className="h-5 w-5 text-amber-400 shrink-0" aria-hidden /> Official list above — 45 barangays of Isabela City
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
