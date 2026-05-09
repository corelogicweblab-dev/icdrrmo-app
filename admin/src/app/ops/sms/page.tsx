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
            <Satellite className="h-5 w-5 text-sky-400 shrink-0" aria-hidden /> Incoming SMS SOS parser + geocode
          </li>
          <li className="flex gap-3">
            <Rows3 className="h-5 w-5 text-emerald-400 shrink-0" aria-hidden /> Message logs + searchable archive
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
        title="BullMQ outbound lane"
        subtitle="Requires REDIS_URL on API + parallel worker process"
      >
        <p className="text-sm text-zinc-400 leading-relaxed mb-3">
          When ops checks <strong className="text-zinc-200">notify SMS</strong> on an incident PATCH, Nest enqueues{" "}
          <code className="text-[11px] font-mono text-rose-300/90">sms-retry</code> jobs. Process them with:
        </p>
        <pre className="rounded-lg bg-black/50 border border-white/[0.06] p-4 font-mono text-[11px] text-emerald-200/85 overflow-auto scroll-ops">
          {`cd backend && npm run build\nREDIS_URL=redis://localhost:6379 npm run worker:bull`}
        </pre>
        <p className="mt-3 text-[11px] text-zinc-600">
          Pair with <code className="font-mono text-zinc-400">notification-fanout</code> worker (same script) for
          in-app notification rows + future FCM/APNs.
        </p>
      </OpsPanelCard>
    </div>
  );
}
