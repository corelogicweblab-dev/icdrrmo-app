"use client";

import type { ReactElement } from "react";
import { Activity, Cpu, Landmark, Radar, Timer } from "lucide-react";
import { OpsPanelCard } from "@/components/ops/ops-widgets";

export default function OpsAnalyticsPage(): ReactElement {
  const bars = [40, 55, 35, 70, 50, 80, 45, 62, 38, 71, 55, 90];
  const max = Math.max(...bars, 1);

  return (
    <div className="p-4 lg:p-6 grid gap-4 lg:grid-cols-12">
      <OpsPanelCard title="Smart city analytics" subtitle="Historical + forecasting hooks" className="lg:col-span-8">
        <div className="flex items-end gap-1 h-[120px]" role="presentation">
          {bars.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-gradient-to-t from-orange-900/30 to-orange-500/55"
              style={{ height: `${(v / max) * 100}%` }}
            />
          ))}
        </div>
        <p className="mt-3 text-[11px] text-zinc-500">
          Incident frequency normalization — pair with Postgres `incident.createdAt` rollup jobs.
        </p>
      </OpsPanelCard>
      <OpsPanelCard title="KPI catalog" className="lg:col-span-4">
        <ul className="space-y-2 text-sm text-zinc-400">
          <li className="flex gap-2">
            <Landmark className="h-5 w-5 text-rose-400 shrink-0" aria-hidden /> High-risk barangay matrix
          </li>
          <li className="flex gap-2">
            <Timer className="h-5 w-5 text-orange-400 shrink-0" aria-hidden /> Median arrival / clearance times
          </li>
          <li className="flex gap-2">
            <Activity className="h-5 w-5 text-orange-400 shrink-0" aria-hidden /> Responder SLA scorecards
          </li>
          <li className="flex gap-2">
            <Radar className="h-5 w-5 text-amber-400 shrink-0" aria-hidden /> Disaster trend composites
          </li>
          <li className="flex gap-2">
            <Cpu className="h-5 w-5 text-violet-400 shrink-0" aria-hidden /> AI risk inference (planned feature store)
          </li>
        </ul>
      </OpsPanelCard>
    </div>
  );
}
