"use client";

import type { ReactElement } from "react";
import { Fuel, Truck, Wrench } from "lucide-react";
import { OpsPanelCard } from "@/components/ops/ops-widgets";

const FLEET = [
  { asset: "AMB-07", type: "ALS Ambulance", fuel: "78%", maint: "due 12d" },
  { asset: "RB-02", type: "Rescue boat", fuel: "full", maint: "cleared" },
  { asset: "ENG-04", type: "Fire pumper", fuel: "61%", maint: "inspect hose" },
];

export default function OpsVehiclesPage(): ReactElement {
  return (
    <div className="p-4 lg:p-6 grid gap-4 md:grid-cols-2">
      <OpsPanelCard title="Fleet & equipment" subtitle="Ambulances · boats · trucks · gear">
        <ul className="space-y-4">
          {FLEET.map((v) => (
            <li key={v.asset} className="rounded-xl border border-white/[0.06] bg-black/30 p-4">
              <div className="flex justify-between gap-4">
                <div>
                  <p className="font-mono text-sm text-white">{v.asset}</p>
                  <p className="text-xs text-zinc-500">{v.type}</p>
                </div>
                <Truck className="h-8 w-8 text-zinc-600 shrink-0" aria-hidden />
              </div>
              <div className="mt-3 flex gap-6 text-[11px] text-zinc-400">
                <span className="inline-flex gap-1.5 items-center">
                  <Fuel className="h-3.5 w-3.5 text-amber-400" aria-hidden /> {v.fuel}
                </span>
                <span className="inline-flex gap-1.5 items-center">
                  <Wrench className="h-3.5 w-3.5 text-emerald-400" aria-hidden /> {v.maint}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </OpsPanelCard>
      <OpsPanelCard title="Resource tracking features">
        <ul className="list-disc ml-5 text-sm text-zinc-400 space-y-2 leading-relaxed">
          <li>Real-time breadcrumb telemetry from AVL / SAT phone backhaul</li>
          <li>Equipment manifest per vehicle (stretchers, PPE kits, AED)</li>
          <li>Fuel thresholds + predictive maintenance SLA</li>
          <li>Dispatch pairing — link unit ↔ incident IDs</li>
        </ul>
      </OpsPanelCard>
    </div>
  );
}
