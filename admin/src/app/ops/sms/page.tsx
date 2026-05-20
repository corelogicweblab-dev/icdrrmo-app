"use client";

import type { ReactElement } from "react";
import { Cpu, RefreshCwOff, Rows3, Satellite } from "lucide-react";
import { OpsPanelCard } from "@/components/ops/ops-widgets";

export default function OpsSmsPage(): ReactElement {
  return (
    <div className="p-4 lg:p-6 grid gap-4 lg:grid-cols-2">
      <OpsPanelCard title="SMS fallback operations" subtitle="Disaster-survivable ingestion">
        <ul className="space-y-3 text-sm text-zinc-300">
          <li className="flex gap-3">
            <Satellite className="h-5 w-5 text-orange-400 shrink-0" aria-hidden /> Incoming SMS SOS parser + geocode
          </li>
          <li className="flex gap-3">
            <Rows3 className="h-5 w-5 text-orange-400 shrink-0" aria-hidden /> Message logs + searchable archive
          </li>
          <li className="flex gap-3">
            <RefreshCwOff className="h-5 w-5 text-amber-400 shrink-0" aria-hidden /> Delivery receipts + adaptive retry queues
          </li>
          <li className="flex gap-3">
            <Cpu className="h-5 w-5 text-rose-400 shrink-0" aria-hidden /> GSM modem telemetry + failover SIM status
          </li>
        </ul>
      </OpsPanelCard>
      <OpsPanelCard
        title="SMS outbound queue"
        subtitle="Requires Redis on the API host and a background worker process"
      >
        <p className="text-sm text-zinc-400 leading-relaxed mb-3">
          When operators request SMS notifications on an incident update, the API queues delivery jobs. Your hosting
          team runs the SMS worker alongside the API so messages are sent and retried reliably.
        </p>
        <p className="text-[11px] text-zinc-600">
          In-app notification fan-out uses the same worker infrastructure when enabled.
        </p>
      </OpsPanelCard>
    </div>
  );
}
