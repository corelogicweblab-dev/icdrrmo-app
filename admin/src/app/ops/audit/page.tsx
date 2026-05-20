"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Globe, KeyRound, Shield, UserCog } from "lucide-react";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { OpsPanelCard } from "@/components/ops/ops-widgets";
import { opsFetchJson } from "@/lib/ops-api";

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

  useEffect(() => {
    const token = tokens?.accessToken;
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await opsFetchJson<{ items: AuditRow[] }>("/audit-logs?take=50", token);
        if (!cancelled) setRows(data.items ?? (data as unknown as AuditRow[]));
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load audit logs");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokens?.accessToken]);

  return (
    <div className="p-4 lg:p-6 grid gap-4 lg:grid-cols-12">
      <OpsPanelCard title="Immutable audit ledger" subtitle="COA · DILG · Data Privacy Act" className="lg:col-span-8">
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
                <tr key={r.id} className="border-b border-orange-500/08 text-zinc-300 font-mono">
                  <td className="py-2 pr-4 text-zinc-500">{new Date(r.createdAt).toLocaleString("en-PH")}</td>
                  <td className="py-2 pr-4">{r.actor?.email ?? "—"}</td>
                  <td className="py-2 pr-4 text-orange-200/90">{r.action}</td>
                  <td className="py-2 pr-4">
                    {r.entityType ?? "—"}
                    {r.entityId ? ` · ${r.entityId.slice(0, 8)}` : ""}
                  </td>
                  <td className="py-2">{r.ipAddress ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && !err ? <p className="text-xs text-zinc-500 mt-3">No audit entries yet.</p> : null}
      </OpsPanelCard>
      <OpsPanelCard title="Security scope">
        <ul className="space-y-2 text-sm text-zinc-400">
          <li className="flex gap-2">
            <KeyRound className="h-4 w-4 text-rose-400" aria-hidden /> Login attempts (JWT access)
          </li>
          <li className="flex gap-2">
            <UserCog className="h-4 w-4 text-orange-400" aria-hidden /> Role mutation trail
          </li>
          <li className="flex gap-2">
            <Globe className="h-4 w-4 text-orange-400" aria-hidden /> External API bearer usage
          </li>
          <li className="flex gap-2">
            <Shield className="h-4 w-4 text-zinc-500" aria-hidden /> SSO via OIDC_ISSUER_URL (when configured)
          </li>
        </ul>
      </OpsPanelCard>
    </div>
  );
}
