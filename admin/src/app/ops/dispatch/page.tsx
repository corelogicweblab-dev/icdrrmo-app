"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { Clock4, LocateFixed, Send, Truck } from "lucide-react";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { OpsPanelCard } from "@/components/ops/ops-widgets";
import { isOpsAuditor } from "@/lib/decode-jwt-role";
import { loadDispatchSuggestions } from "@/lib/command-center-snapshot";

type Suggestions = {
  incidentId: string;
  suggestedResponders: Array<{
    responderId: string;
    email: string;
    status: string;
    distanceKm: number;
    etaMin: number | null;
    vehicle: string | null;
  }>;
  suggestedVehicles: Array<{
    vehicleId: string;
    plateNumber: string;
    type: string | null;
    distanceKm: number;
    etaMin: number;
  }>;
};

export default function OpsDispatchPage(): ReactElement {
  const { queue, tokens } = useOpsSession();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [busy, setBusy] = useState(false);
  const readOnly = isOpsAuditor(tokens?.accessToken);

  useEffect(() => {
    if (!selectedId && queue[0]?.id) setSelectedId(queue[0].id);
  }, [queue, selectedId]);

  const loadSuggestions = useCallback(async () => {
    const token = tokens?.accessToken;
    if (!token || !selectedId) return;
    setBusy(true);
    try {
      const data = await loadDispatchSuggestions(token, selectedId);
      setSuggestions(data);
    } finally {
      setBusy(false);
    }
  }, [selectedId, tokens?.accessToken]);

  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);

  return (
    <div className="p-4 lg:p-6 grid gap-4 lg:grid-cols-12">
      <OpsPanelCard
        title="Automated dispatch suggestions"
        subtitle="Nearest responder & vehicle by GPS · rule-based ETA"
        className="lg:col-span-8"
      >
        <div className="flex flex-wrap gap-2 mb-4">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Incident</label>
          <select
            className="icd-input max-w-md text-xs"
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value || null)}
            disabled={readOnly}
          >
            {queue.map((q) => (
              <option key={q.id} value={q.id}>
                {q.type} · {q.status} · {q.id.slice(0, 8)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void loadSuggestions()}
            disabled={busy || readOnly}
            className="rounded-lg border border-orange-500/30 bg-orange-950/30 px-3 py-1.5 text-[11px] font-semibold text-orange-100 hover:bg-orange-900/40 disabled:opacity-50"
          >
            {busy ? "Computing…" : "Refresh suggestions"}
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-semibold text-orange-300 uppercase tracking-wider mb-2 flex items-center gap-1">
              <LocateFixed className="h-3.5 w-3.5" aria-hidden />
              Responders
            </h3>
            <ul className="space-y-2 text-xs">
              {suggestions?.suggestedResponders.map((r) => (
                <li
                  key={r.responderId}
                  className="rounded-lg border border-orange-500/15 bg-black/35 px-3 py-2 flex justify-between gap-2"
                >
                  <span className="text-zinc-300 truncate">{r.email}</span>
                  <span className="font-mono text-orange-200 shrink-0">
                    {r.distanceKm} km · {r.etaMin != null ? `~${r.etaMin} min` : "GPS?"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-orange-300 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Truck className="h-3.5 w-3.5" aria-hidden />
              Vehicles
            </h3>
            <ul className="space-y-2 text-xs">
              {suggestions?.suggestedVehicles.map((v) => (
                <li
                  key={v.vehicleId}
                  className="rounded-lg border border-orange-500/15 bg-black/35 px-3 py-2 flex justify-between gap-2"
                >
                  <span className="text-zinc-300">
                    {v.plateNumber} {v.type ? `· ${v.type}` : ""}
                  </span>
                  <span className="font-mono text-orange-200 shrink-0">
                    {v.distanceKm} km · ~{v.etaMin} min
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {!suggestions?.suggestedResponders.length && !busy ? (
          <p className="mt-4 text-[11px] text-amber-200/90">
            Dispatch suggestions need the latest API on Render. Assign responders manually on Live incidents until deploy
            completes.
          </p>
        ) : null}
        {readOnly ? (
          <p className="mt-4 text-[11px] text-amber-200/90">Auditor role: suggestions are view-only.</p>
        ) : (
          <p className="mt-4 text-[11px] text-zinc-600">
            Confirm assignment on{" "}
            <a href="/ops/incidents" className="text-orange-400 hover:underline">
              Live incidents
            </a>
            .
          </p>
        )}
      </OpsPanelCard>
      <OpsPanelCard title="Dispatch SLA" subtitle="Enterprise targets">
        <ul className="text-xs text-zinc-400 space-y-2">
          <li className="flex gap-2">
            <Send className="h-4 w-4 text-rose-400 shrink-0" aria-hidden />
            Acknowledge critical SOS &lt; 2 min
          </li>
          <li className="flex gap-2">
            <Clock4 className="h-4 w-4 text-orange-400 shrink-0" aria-hidden />
            First unit en route &lt; 8 min (urban)
          </li>
        </ul>
      </OpsPanelCard>
    </div>
  );
}
