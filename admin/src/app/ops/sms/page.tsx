"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, RefreshCw, Satellite } from "lucide-react";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { OpsPanelCard } from "@/components/ops/ops-widgets";
import { opsFetchJson } from "@/lib/ops-api";

type InboundRow = {
  id: string;
  fromPhone: string;
  body: string;
  processed: boolean;
  createdAt: string;
  incident?: { id: string; type: string; status: string } | null;
};

type OutboundRow = {
  id: string;
  toPhone: string;
  message: string;
  status: string;
  attempts: number;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
  incident?: { id: string; type: string } | null;
};

type Archive = {
  inbound: InboundRow[];
  outbound: OutboundRow[];
};

function statusTone(s: string): string {
  if (s === "SENT") return "text-emerald-400";
  if (s === "FAILED" || s === "DEAD_LETTER") return "text-rose-400";
  return "text-amber-300";
}

export default function OpsSmsPage(): ReactElement {
  const { tokens } = useOpsSession();
  const [archive, setArchive] = useState<Archive | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const token = tokens?.accessToken;
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const data = await opsFetchJson<Archive>("/communications/archive?take=60", token);
      setArchive(data);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load SMS archive");
    } finally {
      setBusy(false);
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const inbound = archive?.inbound ?? [];
  const outbound = archive?.outbound ?? [];

  return (
    <div className="p-4 lg:p-6 grid gap-4 lg:grid-cols-12">
      <OpsPanelCard
        title="SMS communications archive"
        subtitle="Inbound SOS relay · outbound delivery log"
        className="lg:col-span-12"
      >
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => void load()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-orange-500/25 bg-zinc-900/80 px-3 py-1.5 text-xs text-orange-200 hover:border-rose-500/35 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        </div>
        {err ? <p className="text-sm text-rose-300 mb-3">{err}</p> : null}
        <p className="text-sm text-zinc-500">
          To push in-app alerts to citizens (Alerts tab), use{" "}
          <Link href="/ops/barangays" className="text-orange-300 hover:text-orange-200 underline font-medium">
            Barangay hazards
          </Link>
          , not this SMS log.
        </p>
      </OpsPanelCard>

      <OpsPanelCard title="Inbound SMS" subtitle={`${inbound.length} recent`} className="lg:col-span-6">
        <div className="overflow-x-auto max-h-[480px] scroll-ops">
          <table className="min-w-full text-left text-[11px]">
            <thead className="text-zinc-500 uppercase tracking-wider border-b border-orange-500/12 sticky top-0 bg-black/90">
              <tr>
                <th className="py-2 pr-3 font-medium">Time</th>
                <th className="py-2 pr-3 font-medium">From</th>
                <th className="py-2 pr-3 font-medium">Body</th>
                <th className="py-2 font-medium">Incident</th>
              </tr>
            </thead>
            <tbody>
              {inbound.map((r) => (
                <tr key={r.id} className="border-b border-orange-500/08 text-zinc-300">
                  <td className="py-2 pr-3 text-zinc-500 whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleString("en-PH")}
                  </td>
                  <td className="py-2 pr-3 font-mono text-orange-200/90">{r.fromPhone}</td>
                  <td className="py-2 pr-3 max-w-[200px] truncate" title={r.body}>
                    {r.body}
                  </td>
                  <td className="py-2 font-mono text-zinc-500">
                    {r.incident ? (
                      <span className="text-orange-300/90">{r.incident.id.slice(0, 8)}…</span>
                    ) : r.processed ? (
                      "parsed"
                    ) : (
                      "pending"
                    )}
                  </td>
                </tr>
              ))}
              {!inbound.length && !busy ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-600">
                    <Satellite className="h-6 w-6 mx-auto mb-2 text-zinc-700" aria-hidden />
                    No inbound messages yet
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </OpsPanelCard>

      <OpsPanelCard title="Outbound SMS" subtitle={`${outbound.length} recent`} className="lg:col-span-6">
        <div className="overflow-x-auto max-h-[480px] scroll-ops">
          <table className="min-w-full text-left text-[11px]">
            <thead className="text-zinc-500 uppercase tracking-wider border-b border-orange-500/12 sticky top-0 bg-black/90">
              <tr>
                <th className="py-2 pr-3 font-medium">Time</th>
                <th className="py-2 pr-3 font-medium">To</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {outbound.map((r) => (
                <tr key={r.id} className="border-b border-orange-500/08 text-zinc-300">
                  <td className="py-2 pr-3 text-zinc-500 whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleString("en-PH")}
                  </td>
                  <td className="py-2 pr-3 font-mono text-orange-200/90">{r.toPhone}</td>
                  <td className={`py-2 pr-3 font-medium uppercase ${statusTone(r.status)}`}>
                    {r.status}
                    {r.attempts > 1 ? ` ·×${r.attempts}` : ""}
                  </td>
                  <td className="py-2 max-w-[220px] truncate" title={r.lastError ?? r.message}>
                    {r.message}
                  </td>
                </tr>
              ))}
              {!outbound.length && !busy ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-600">
                    No outbound messages queued yet
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </OpsPanelCard>

      <div className="lg:col-span-12 grid gap-3 sm:grid-cols-2 text-sm text-zinc-400">
        <p className="flex gap-2 items-start">
          <ArrowDownLeft className="h-5 w-5 text-orange-400 shrink-0" aria-hidden />
          Inbound SOS flows through the SMS webhook parser and geocode pipeline.
        </p>
        <p className="flex gap-2 items-start">
          <ArrowUpRight className="h-5 w-5 text-rose-400 shrink-0" aria-hidden />
          Outbound rows are created when operators notify reporters or chairman SMS fallback runs.
        </p>
      </div>
    </div>
  );
}
