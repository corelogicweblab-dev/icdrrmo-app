"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { Crosshair, Send } from "lucide-react";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { OpsPanelCard } from "@/components/ops/ops-widgets";
import { opsFetchJson, OpsApiError } from "@/lib/ops-api";
import { API_INCIDENTS_RESPONDERS_ASSIGNABLE_PATH } from "@/lib/ops-api-paths";
import type { OpsIncident } from "@/components/ops/ops-types";

type AssignableResponder = {
  id: string;
  badgeNumber: string | null;
  status: string;
  email: string;
};

export function MapDispatchPanel(): ReactElement {
  const { tokens, queue, refreshQueue } = useOpsSession();
  const [incidentId, setIncidentId] = useState("");
  const [responderId, setResponderId] = useState("");
  const [responders, setResponders] = useState<AssignableResponder[]>([]);
  const [status, setStatus] = useState("DISPATCHED");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const access = tokens?.accessToken;
    if (!access) return;
    let cancelled = false;
    (async () => {
      try {
        const json = await opsFetchJson<AssignableResponder[]>(API_INCIDENTS_RESPONDERS_ASSIGNABLE_PATH, access);
        if (cancelled) return;
        setResponders(Array.isArray(json) ? json : []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokens?.accessToken]);

  useEffect(() => {
    if (!incidentId && queue.length > 0) {
      setIncidentId(queue[0].id);
    }
  }, [queue, incidentId]);

  const patch = useCallback(async () => {
    if (!tokens?.accessToken || !incidentId) return;
    setLoading(true);
    setMsg(null);
    try {
      const body: Record<string, unknown> = {};
      if (responderId) body.assignedResponderId = responderId;
      if (status) body.status = status;
      if (Object.keys(body).length === 0) {
        setMsg("Select responder and/or status.");
        setLoading(false);
        return;
      }
      await opsFetchJson(`/incidents/${incidentId}`, tokens.accessToken, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setMsg("Dispatch updated.");
      await refreshQueue(tokens.accessToken);
    } catch (e: unknown) {
      setMsg(e instanceof OpsApiError ? e.body?.slice(0, 200) ?? e.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }, [tokens?.accessToken, incidentId, responderId, status, refreshQueue]);

  const incidents: OpsIncident[] = queue;

  return (
    <OpsPanelCard
      title="Dispatch from map"
      subtitle="PATCH /incidents/:id — assign responder + advance status"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-[10px] uppercase tracking-wider text-zinc-500">
          Incident
          <select
            value={incidentId}
            onChange={(e) => setIncidentId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-orange-500/20 bg-black/50 px-3 py-2 text-sm text-white"
          >
            {incidents.map((i) => (
              <option key={i.id} value={i.id}>
                {(i.title ?? i.id).slice(0, 48)} · {i.status}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[10px] uppercase tracking-wider text-zinc-500">
          Assign responder
          <select
            value={responderId}
            onChange={(e) => setResponderId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-orange-500/20 bg-black/50 px-3 py-2 text-sm text-white"
          >
            <option value="">— Unassign / skip —</option>
            {responders.map((r) => (
              <option key={r.id} value={r.id}>
                {r.email} · {r.status}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[10px] uppercase tracking-wider text-zinc-500">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-lg border border-orange-500/20 bg-black/50 px-3 py-2 text-sm text-white"
          >
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="DISPATCHED">DISPATCHED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
            <option value="FALSE_ALARM">FALSE_ALARM</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            disabled={loading || !tokens?.accessToken}
            onClick={() => void patch()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600/90 px-4 py-2.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-40"
          >
            <Send className="h-4 w-4" aria-hidden />
            {loading ? "Applying…" : "Apply dispatch"}
          </button>
        </div>
      </div>
      {msg ? (
        <p className="mt-2 flex items-start gap-2 text-xs text-zinc-400">
          <Crosshair className="h-4 w-4 shrink-0 text-rose-400" aria-hidden />
          {msg}
        </p>
      ) : null}
    </OpsPanelCard>
  );
}
