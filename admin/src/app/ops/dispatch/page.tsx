"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactElement } from "react";
import { Clock4, History, LocateFixed, Send, Share2, Timer } from "lucide-react";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { OpsPanelCard } from "@/components/ops/ops-widgets";

const TILES: { label: string; icon: LucideIcon }[] = [
  { label: "One-click dispatch", icon: Send },
  { label: "Nearest responder detection", icon: LocateFixed },
  { label: "Route optimization / ETA", icon: Share2 },
  { label: "Multi-unit batch dispatch", icon: Send },
  { label: "Priority queue ranking", icon: Timer },
  { label: "Replay dispatch timeline", icon: History },
  { label: "SLA dispatch timers", icon: Clock4 },
  { label: "Radio cross-patch", icon: Send },
];

export default function OpsDispatchPage(): ReactElement {
  const { queue } = useOpsSession();
  return (
    <div className="p-4 lg:p-6 grid gap-4 lg:grid-cols-12">
      <OpsPanelCard title="911-style dispatch stack" subtitle="Nearest-unit suggestions + route optimization" className="lg:col-span-8">
        <div className="grid sm:grid-cols-2 gap-3">
          {TILES.map(({ label, icon: Icon }) => (
            <div key={label} className="flex gap-3 rounded-xl border border-orange-500/12 bg-black/35 p-4">
              <Icon className="h-5 w-5 text-rose-400 shrink-0" aria-hidden />
              <p className="text-sm text-zinc-300">{label}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-zinc-600">
          Dispatch board — assignments and routing will appear here as the module is completed. Open incidents in queue:{" "}
          <span className="font-mono text-zinc-400">{queue.length}</span>
        </p>
      </OpsPanelCard>
      <OpsPanelCard title="Suggested stack (sim)" subtitle="Illustrative ETA examples for planning">
        <ul className="text-xs text-zinc-400 space-y-2 font-mono">
          <li>Unit A1 · EMS · 6 min ETA</li>
          <li>Unit R3 · Rescue · 9 min ETA</li>
          <li>BFP Q2 · Fire · 11 min ETA</li>
        </ul>
      </OpsPanelCard>
    </div>
  );
}
