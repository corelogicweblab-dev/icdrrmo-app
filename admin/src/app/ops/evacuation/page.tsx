"use client";

import type { ReactElement } from "react";
import { ClipboardList, Home, Pill, Users } from "lucide-react";
import { OpsPanelCard } from "@/components/ops/ops-widgets";

const SHELTERS = [
  { id: "EC-ISA-01", name: "Sports complex", capacity: 850, occ: 142, med: "Triage bay A" },
  { id: "EC-ISA-02", name: "Elementary annex", capacity: 420, occ: 0, med: "Idle" },
  { id: "EC-ISA-03", name: "Port terminal hall", capacity: 300, occ: 37, med: "Nurse onsite" },
];

export default function OpsEvacuationPage(): ReactElement {
  return (
    <div className="p-4 lg:p-6 grid gap-4 lg:grid-cols-2">
      <OpsPanelCard title="Evacuation center board" subtitle="Capacity · occupancy · supplies">
        <ul className="space-y-4">
          {SHELTERS.map((s) => (
            <li key={s.id} className="rounded-xl border border-white/[0.06] p-4 bg-black/30">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="text-xs font-mono text-zinc-500">{s.id}</p>
                  <p className="text-sm font-semibold text-white mt-1 flex items-center gap-2">
                    <Home className="h-4 w-4 text-emerald-400" aria-hidden /> {s.name}
                  </p>
                </div>
                <span className="text-[11px] text-zinc-400 font-mono tabular-nums">
                  {s.occ}/{s.capacity}
                </span>
              </div>
              <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500/45" style={{ width: `${(s.occ / s.capacity) * 100}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-zinc-500 flex items-center gap-2">
                <Pill className="h-3.5 w-3.5" aria-hidden /> {s.med}
              </p>
            </li>
          ))}
        </ul>
      </OpsPanelCard>
      <OpsPanelCard title="Resource inventory" subtitle="Water · food · hygiene · gensets">
        <ul className="text-sm text-zinc-400 space-y-3">
          <li className="flex gap-2">
            <Users className="h-4 w-4 text-sky-400 shrink-0" aria-hidden />
            Occupancy monitoring + headcount QR / manual reconciler
          </li>
          <li className="flex gap-2">
            <ClipboardList className="h-4 w-4 text-amber-400 shrink-0" aria-hidden />
            Supply status & restock tickets (BullMQ jobs)
          </li>
        </ul>
      </OpsPanelCard>
    </div>
  );
}
