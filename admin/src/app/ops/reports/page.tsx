"use client";

import type { ReactElement } from "react";
import { FileDown, Filter, History, Radar } from "lucide-react";
import { OpsPanelCard } from "@/components/ops/ops-widgets";

export default function OpsReportsPage(): ReactElement {
  return (
    <div className="p-4 lg:p-6 grid gap-4 md:grid-cols-12">
      <OpsPanelCard title="Incident archives" subtitle="Saved searches · PDF ICS-214 bundles" className="md:col-span-8">
        <div className="flex flex-wrap gap-2 mb-4">
          {["Date range", "Type", "Barangay", "Outcome", "Unit"].map((f) => (
            <button
              key={f}
              type="button"
              className="rounded-lg border border-white/12 bg-black/35 px-3 py-1.5 text-[11px] text-zinc-400 hover:bg-white/[0.05] inline-flex gap-2 items-center"
            >
              <Filter className="h-3.5 w-3.5" aria-hidden /> {f}
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-dashed border-white/10 p-12 text-center text-sm text-zinc-500 flex flex-col items-center gap-3">
          <History className="h-10 w-10 opacity-60" aria-hidden />
          Incident summaries and exports connect to the reporting service when enabled.
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] px-4 py-2 text-xs font-medium text-zinc-300"
          >
            <FileDown className="h-4 w-4" aria-hidden /> Generate PDF stub
          </button>
        </div>
      </OpsPanelCard>
      <OpsPanelCard title="Heatmap replay">
        <p className="text-sm text-zinc-400 flex gap-2">
          <Radar className="h-5 w-5 text-sky-400 shrink-0" aria-hidden /> Timeline GIS scrubber — hydrate Mapbox temporal
          layer from archived coordinates.
        </p>
      </OpsPanelCard>
    </div>
  );
}
