"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { OpsPanelCard } from "@/components/ops/ops-widgets";
import { opsApiErrorUserMessage, opsFetchJson, OpsApiError } from "@/lib/ops-api";

type AuditRow = {
  id: string;
  createdAt: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  actor?: { email: string; role: string } | null;
  ipAddress: string | null;
};

export default function OpsAuditPage(): ReactElement {
  const { tokens } = useOpsSession();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const token = tokens?.accessToken;
    if (!token) return;
    setLoading(true);
    setErr(null);
    try {
      const data = await opsFetchJson<{ items: AuditRow[] }>("/audit-logs?take=50", token);
      const items = Array.isArray(data.items) ? data.items : Array.isArray(data) ? (data as AuditRow[]) : [];
      setRows(items);
    } catch (e: unknown) {
      setRows([]);
      setErr(e instanceof OpsApiError ? opsApiErrorUserMessage(e) : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="p-4 lg:p-6">
      <OpsPanelCard title="Audit ledger" subtitle="Recent system activity for compliance review" className="lg:col-span-12">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[11px] text-zinc-500">Newest entries first · refreshes on load</p>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || !tokens?.accessToken}
            className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/20 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-300 hover:bg-white/[0.06] disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden />}
            Refresh
          </button>
        </div>
        {err ? <p className="text-sm text-rose-300 mb-3">{err}</p> : null}
        <div className="overflow-x-auto max-h-[520px] scroll-ops">
          <table className="min-w-full text-left text-[11px]">
            <thead className="text-zinc-500 uppercase tracking-wider border-b border-orange-500/12 sticky top-0 bg-black/90">
              <tr>
                <th className="py-2 pr-4 font-medium">Time</th>
                <th className="py-2 pr-4 font-medium">Actor</th>
                <th className="py-2 pr-4 font-medium">Action</th>
                <th className="py-2 pr-4 font-medium">Entity</th>
                <th className="py-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-orange-500/08 text-zinc-300">
                  <td className="py-2 pr-4 text-zinc-500 whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleString("en-PH")}
                  </td>
                  <td className="py-2 pr-4">{r.actor?.email ?? "—"}</td>
                  <td className="py-2 pr-4 text-orange-200/90">{r.action}</td>
                  <td className="py-2 pr-4 font-mono text-[10px]">
                    {r.entityType ?? "—"}
                    {r.entityId ? ` · ${r.entityId.slice(0, 8)}` : ""}
                  </td>
                  <td className="py-2">{r.ipAddress ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && !loading && !err ? <p className="text-xs text-zinc-500 mt-3">No audit entries yet.</p> : null}
        {loading && !rows.length ? (
          <p className="flex items-center gap-2 text-sm text-zinc-500 mt-3">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
          </p>
        ) : null}
      </OpsPanelCard>
    </div>
  );
}
