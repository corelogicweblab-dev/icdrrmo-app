"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { Headphones, Mic, PhoneCall, RefreshCw } from "lucide-react";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { OpsPanelCard } from "@/components/ops/ops-widgets";
import { opsFetchJson } from "@/lib/ops-api";
import { getOpsVoiceHotline } from "@/lib/env";

type VoiceRow = {
  id: string;
  roomId: string;
  provider: string;
  startedAt: string;
  endedAt: string | null;
  incident?: { id: string; type: string } | null;
  initiator?: { email: string } | null;
  participant?: { email: string } | null;
};

export default function OpsVoicePage(): ReactElement {
  const { tokens } = useOpsSession();
  const [rows, setRows] = useState<VoiceRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hotline = getOpsVoiceHotline();

  const load = useCallback(async () => {
    const token = tokens?.accessToken;
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const data = await opsFetchJson<VoiceRow[]>("/communications/voice?take=50", token);
      setRows(data);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load voice archive");
    } finally {
      setBusy(false);
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="p-4 lg:p-6 grid gap-4 lg:grid-cols-12">
      <OpsPanelCard
        title="Voice session archive"
        subtitle="WebRTC call logs · dispatch bridge"
        className="lg:col-span-8"
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
          {hotline ? (
            <span className="text-[11px] text-zinc-500">
              PSTN hotline: <span className="font-mono text-orange-200">{hotline}</span>
            </span>
          ) : null}
        </div>
        {err ? <p className="text-sm text-rose-300 mb-3">{err}</p> : null}
        <div className="overflow-x-auto max-h-[520px] scroll-ops">
          <table className="min-w-full text-left text-[11px]">
            <thead className="text-zinc-500 uppercase tracking-wider border-b border-orange-500/12 sticky top-0 bg-black/90">
              <tr>
                <th className="py-2 pr-3 font-medium">Started</th>
                <th className="py-2 pr-3 font-medium">Room</th>
                <th className="py-2 pr-3 font-medium">Initiator</th>
                <th className="py-2 pr-3 font-medium">Participant</th>
                <th className="py-2 font-medium">Incident</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-orange-500/08 text-zinc-300">
                  <td className="py-2 pr-3 text-zinc-500 whitespace-nowrap">
                    {new Date(r.startedAt).toLocaleString("en-PH")}
                  </td>
                  <td className="py-2 pr-3 font-mono text-orange-200/80" title={r.provider}>
                    {r.roomId.slice(0, 12)}…
                  </td>
                  <td className="py-2 pr-3">{r.initiator?.email ?? "—"}</td>
                  <td className="py-2 pr-3">{r.participant?.email ?? "—"}</td>
                  <td className="py-2 font-mono text-zinc-500">
                    {r.incident ? `${r.incident.id.slice(0, 8)}…` : "—"}
                    {r.endedAt
                      ? ` · ${Math.round((new Date(r.endedAt).getTime() - new Date(r.startedAt).getTime()) / 1000)}s`
                      : " · live"}
                  </td>
                </tr>
              ))}
              {!rows.length && !busy ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-zinc-600">
                    <PhoneCall className="h-6 w-6 mx-auto mb-2 text-zinc-700" aria-hidden />
                    No voice sessions logged yet
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </OpsPanelCard>

      <OpsPanelCard title="Live voice (WebRTC)" className="lg:col-span-4">
        <ul className="space-y-3 text-sm text-zinc-300">
          <li className="flex gap-3">
            <Mic className="h-5 w-5 text-rose-400 shrink-0" aria-hidden />
            Responder duplex rooms via Nest RTC + TURN when configured
          </li>
          <li className="flex gap-3">
            <Headphones className="h-5 w-5 text-orange-400 shrink-0" aria-hidden />
            Command headset patch groups (moderated)
          </li>
          <li className="flex gap-3">
            <PhoneCall className="h-5 w-5 text-amber-400 shrink-0" aria-hidden />
            Archive above records completed sessions from `voice_call_logs`
          </li>
        </ul>
      </OpsPanelCard>
    </div>
  );
}
