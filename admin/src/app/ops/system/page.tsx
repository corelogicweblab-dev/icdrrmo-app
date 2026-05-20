"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  Cpu,
  Database,
  HardDrive,
  Loader2,
  Radio,
  RefreshCw,
  Server,
  Wifi,
  Workflow,
} from "lucide-react";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { OpsPanelCard } from "@/components/ops/ops-widgets";
import { opsFetchJson, OpsApiError } from "@/lib/ops-api";
import { isOpsGlobalAdmin } from "@/lib/decode-jwt-role";

type Metrics = {
  service?: string;
  uptimeSec?: number;
  pid?: number;
  node?: string;
  memory?: { rss?: number; heapUsed?: number; heapTotal?: number; external?: number };
  database?: { reachable?: boolean };
  redis?: { configured?: boolean };
  env?: { nodeEnv?: string };
};

type LogLine = Record<string, unknown> & { kind?: string; at?: string };

type LogsResponse = {
  merged?: LogLine[];
  audit?: number;
  incidentLogs?: number;
};

function formatBytes(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function OpsSystemPage(): ReactElement {
  const { socketState, apiReachable, tokens } = useOpsSession();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsErr, setMetricsErr] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [logsMeta, setLogsMeta] = useState<string | null>(null);
  const [logsErr, setLogsErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const access = tokens?.accessToken;
    if (!access) return;
    setBusy(true);
    setMetricsErr(null);
    setLogsErr(null);
    try {
      const [m, l] = await Promise.all([
        opsFetchJson<Metrics>("/system/metrics", access),
        opsFetchJson<LogsResponse>(`/system/logs?limit=120`, access),
      ]);
      setMetrics(m);
      setLogs(Array.isArray(l.merged) ? l.merged : []);
      setLogsMeta(
        typeof l.audit === "number" && typeof l.incidentLogs === "number"
          ? `${l.audit} audit entries · ${l.incidentLogs} incident log entries in this window`
          : null,
      );
    } catch (e: unknown) {
      const msg = e instanceof OpsApiError ? e.body?.slice(0, 240) ?? e.message : "Failed to load";
      setMetricsErr(msg);
      setLogsErr(msg);
    } finally {
      setBusy(false);
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const mem = metrics?.memory;

  if (tokens?.accessToken && !isOpsGlobalAdmin(tokens.accessToken)) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm font-medium text-zinc-200">System health is restricted</p>
        <p className="max-w-md text-xs text-zinc-500 leading-relaxed">
          Global administrators only. Desk roles continue to use operational modules without infrastructure probes.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 grid gap-4 lg:grid-cols-3">
      <OpsPanelCard title="Service plane">
        <ul className="space-y-3 text-sm text-zinc-300">
          <li className="flex justify-between gap-4">
            <span className="flex items-center gap-2">
              <Server className="h-4 w-4 text-orange-400" aria-hidden /> Emergency API (browser)
            </span>
            <span className={apiReachable ? "text-orange-400 font-mono text-xs" : "text-rose-400 font-mono text-xs"}>
              {apiReachable === null ? "…" : apiReachable ? "UP" : "DOWN"}
            </span>
          </li>
          <li className="flex justify-between gap-4">
            <span className="flex items-center gap-2">
              <Database className="h-4 w-4 text-violet-400" aria-hidden /> PostgreSQL (API probe)
            </span>
            <span
              className={
                metrics?.database?.reachable ? "text-orange-400 font-mono text-xs" : "text-zinc-500 font-mono text-xs"
              }
            >
              {metrics == null ? "…" : metrics.database?.reachable ? "reachable" : "unreachable"}
            </span>
          </li>
          <li className="flex justify-between gap-4">
            <span className="flex items-center gap-2">
              <Workflow className="h-4 w-4 text-amber-400" aria-hidden /> Message queue (Redis)
            </span>
            <span className="font-mono text-xs text-zinc-400">
              {metrics == null ? "…" : metrics.redis?.configured ? "configured" : "not set"}
            </span>
          </li>
          <li className="flex justify-between gap-4">
            <span className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-orange-400" aria-hidden /> Live channel
            </span>
            <span className="font-mono text-xs text-zinc-400">{socketState === "live" ? "connected" : socketState}</span>
          </li>
          <li className="flex justify-between gap-4">
            <span className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-zinc-500" aria-hidden /> Host
            </span>
            <span className="font-mono text-[10px] text-zinc-500">{metrics?.service ?? "—"}</span>
          </li>
        </ul>
        <p className="mt-4 text-[10px] text-zinc-600">
          ICT monitors API readiness using the configured health endpoint on the server.
        </p>
        {metricsErr ? <p className="mt-2 text-xs text-rose-400/90">{metricsErr}</p> : null}
      </OpsPanelCard>

      <OpsPanelCard title="Process metrics" subtitle="Server process snapshot">
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => void load()}
            disabled={busy || !tokens?.accessToken}
            className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/20 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-300 hover:bg-white/[0.06] disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden />}
            Refresh
          </button>
        </div>
        <ul className="space-y-2 text-xs text-zinc-400 font-mono">
          <li className="flex gap-2">
            <Cpu className="h-4 w-4 text-orange-400 shrink-0" aria-hidden />
            PID {metrics?.pid ?? "—"} · mode {metrics?.env?.nodeEnv ?? "—"}
          </li>
          <li className="flex gap-2">
            <HardDrive className="h-4 w-4 text-orange-400 shrink-0" aria-hidden />
            Uptime {metrics?.uptimeSec != null ? `${metrics.uptimeSec}s` : "—"}
          </li>
          <li className="flex flex-col gap-1 border-t border-orange-500/12 pt-2">
            <span className="text-zinc-500">Memory</span>
            <span>RSS {formatBytes(mem?.rss)}</span>
            <span>Heap {formatBytes(mem?.heapUsed)} / {formatBytes(mem?.heapTotal)}</span>
            <span>External {formatBytes(mem?.external)}</span>
          </li>
        </ul>
      </OpsPanelCard>

      <OpsPanelCard title="Runbooks">
        <p className="text-sm text-zinc-400 leading-relaxed">
          Attach Grafana or host dashboards for CPU, disk, and network. Use the merged log tail below for quick
          incident and audit visibility without opening the database.
        </p>
      </OpsPanelCard>

      <OpsPanelCard title="Merged log tail" subtitle="Recent audit and incident activity" className="lg:col-span-3">
        {logsMeta ? <p className="mb-2 text-[10px] text-zinc-600">{logsMeta}</p> : null}
        {logsErr ? <p className="mb-2 text-xs text-rose-400/90">{logsErr}</p> : null}
        <pre className="max-h-[min(52vh,480px)] overflow-auto rounded-lg border border-orange-500/12 bg-black/50 p-3 text-[10px] leading-relaxed text-zinc-300 font-mono whitespace-pre-wrap break-all">
          {logs.length === 0 && !busy ? "No log lines returned." : null}
          {logs.map((line, i) => (
            <div key={`${String(line.at)}-${i}`} className="border-b border-white/[0.04] py-1.5 last:border-0">
              <span className="text-zinc-500">{line.at ?? "—"}</span>{" "}
              <span className="text-rose-400/80">{line.kind ?? "?"}</span>{" "}
              {JSON.stringify(line)}
            </div>
          ))}
        </pre>
      </OpsPanelCard>
    </div>
  );
}
