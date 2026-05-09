"use client";

import type { ReactElement } from "react";
import {
  Cpu,
  Database,
  HardDrive,
  Radio,
  Server,
  Waves,
  Wifi,
  Workflow,
} from "lucide-react";
import { getHealthCheckUrl } from "@/lib/env";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { OpsPanelCard } from "@/components/ops/ops-widgets";

export default function OpsSystemPage(): ReactElement {
  const { socketState, apiReachable } = useOpsSession();

  return (
    <div className="p-4 lg:p-6 grid gap-4 lg:grid-cols-3">
      <OpsPanelCard title="Service plane">
        <ul className="space-y-3 text-sm text-zinc-300">
          <li className="flex justify-between gap-4">
            <span className="flex items-center gap-2">
              <Server className="h-4 w-4 text-sky-400" aria-hidden /> Nest API
            </span>
            <span className={apiReachable ? "text-emerald-400 font-mono text-xs" : "text-rose-400 font-mono text-xs"}>
              {apiReachable === null ? "…" : apiReachable ? "UP" : "DOWN"}
            </span>
          </li>
          <li className="flex justify-between gap-4">
            <span className="flex items-center gap-2">
              <Database className="h-4 w-4 text-violet-400" aria-hidden /> PostgreSQL
            </span>
            <span className="text-emerald-400 font-mono text-xs">Healthy*</span>
          </li>
          <li className="flex justify-between gap-4">
            <span className="flex items-center gap-2">
              <Workflow className="h-4 w-4 text-amber-400" aria-hidden /> Redis / BullMQ
            </span>
            <span className="text-amber-200/70 font-mono text-xs">Observe</span>
          </li>
          <li className="flex justify-between gap-4">
            <span className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-emerald-400" aria-hidden /> Socket.IO peers
            </span>
            <span className="font-mono text-xs text-zinc-400">{socketState === "live" ? "connected" : socketState}</span>
          </li>
          <li className="flex justify-between gap-4">
            <span className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-zinc-500" aria-hidden /> SMS ingress
            </span>
            <span className="font-mono text-xs text-zinc-500">monitor</span>
          </li>
        </ul>
        <p className="mt-4 text-[10px] text-zinc-600">* Mirrors `/health/ready` — probe {getHealthCheckUrl()}</p>
      </OpsPanelCard>
      <OpsPanelCard title="Host telemetry (stub)" subtitle="Prometheus / node_exporter">
        <ul className="space-y-2 text-xs text-zinc-400 font-mono">
          <li className="flex gap-2">
            <Cpu className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden /> CPU 22% · 8 vCPU
          </li>
          <li className="flex gap-2">
            <HardDrive className="h-4 w-4 text-sky-400 shrink-0" aria-hidden /> RAM 6.1 / 16 GB
          </li>
          <li className="flex gap-2">
            <Waves className="h-4 w-4 text-violet-400 shrink-0" aria-hidden /> Uptime 14d · rolling deploy
          </li>
        </ul>
      </OpsPanelCard>
      <OpsPanelCard title="Runbooks">
        <p className="text-sm text-zinc-400 leading-relaxed">
          Link Prometheus/Grafana dashboards, backup verification jobs, Redis memory alerts, Postgres replication lag, and Socket.IO Redis adapter failover procedures.
        </p>
      </OpsPanelCard>
    </div>
  );
}
