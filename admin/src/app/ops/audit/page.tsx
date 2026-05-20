"use client";

import type { ReactElement } from "react";
import { Globe, KeyRound, Shield, UserCog } from "lucide-react";
import { OpsPanelCard } from "@/components/ops/ops-widgets";

const ROWS = [
  { ts: "2026-05-09T10:41:06Z", actor: "eo.operator", action: "incident_created", detail: "SOS ingestion" },
  { ts: "2026-05-09T10:42:51Z", actor: "api.service", action: "api_access", detail: "Incident queue read" },
];

export default function OpsAuditPage(): ReactElement {
  return (
    <div className="p-4 lg:p-6 grid gap-4 lg:grid-cols-12">
      <OpsPanelCard title="Immutable audit ledger" subtitle="Admin edits · dispatch · sessions" className="lg:col-span-8">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[11px]">
            <thead className="text-zinc-500 uppercase tracking-wider border-b border-orange-500/12">
              <tr>
                <th className="py-2 pr-4 font-medium">UTC</th>
                <th className="py-2 pr-4 font-medium">Actor</th>
                <th className="py-2 pr-4 font-medium">Action</th>
                <th className="py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={`${r.ts}-${r.actor}`} className="border-b border-white/[0.04] text-zinc-300 font-mono">
                  <td className="py-2 pr-4 text-zinc-500">{r.ts}</td>
                  <td className="py-2 pr-4">{r.actor}</td>
                  <td className="py-2 pr-4">{r.action}</td>
                  <td className="py-2">{r.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[10px] text-zinc-600">
          Correlate entries with centralized audit data and server access logs when available.
        </p>
      </OpsPanelCard>
      <OpsPanelCard title="Security scope">
        <ul className="space-y-2 text-sm text-zinc-400">
          <li className="flex gap-2">
            <KeyRound className="h-4 w-4 text-rose-400" aria-hidden /> Login attempts + MFA rollout
          </li>
          <li className="flex gap-2">
            <UserCog className="h-4 w-4 text-orange-400" aria-hidden /> Role mutation trail
          </li>
          <li className="flex gap-2">
            <Globe className="h-4 w-4 text-orange-400" aria-hidden /> External API bearer usage
          </li>
          <li className="flex gap-2">
            <Shield className="h-4 w-4 text-zinc-500" aria-hidden /> SIEM webhook (planned)
          </li>
        </ul>
      </OpsPanelCard>
    </div>
  );
}
