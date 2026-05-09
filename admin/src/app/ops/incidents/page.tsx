"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlarmClock,
  ArrowUpCircle,
  Battery,
  Binoculars,
  Camera,
  Crosshair,
  Gauge,
  History,
  Link2,
  LocateFixed,
  Navigation,
  PhoneForwarded,
  Shield,
  UserCircle,
} from "lucide-react";
import { TARGET_INCIDENT_LIFECYCLE } from "@/components/ops/ops-nav";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { formatOpsSync, incidentBorderClass, statusBadgeClass } from "@/components/ops/ops-format";
import type { OpsIncident } from "@/components/ops/ops-types";
import { OpsPanelCard } from "@/components/ops/ops-widgets";
import { getApiBaseUrl } from "@/lib/env";

const BACKEND_TO_TARGET: Record<string, string> = {
  OPEN: "pending",
  ACKNOWLEDGED: "verified",
  DISPATCHED: "dispatched",
  IN_PROGRESS: "on_scene",
  RESOLVED: "resolved",
  CLOSED: "resolved",
  FALSE_ALARM: "cancelled",
};

const BACKEND_INCIDENT_STATUSES = [
  "OPEN",
  "ACKNOWLEDGED",
  "DISPATCHED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "FALSE_ALARM",
] as const;

type AssignableResponder = {
  id: string;
  badgeNumber: string | null;
  status: string;
  email: string;
};

function toNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function OpsIncidentsPage(): ReactElement {
  const { queue, lastQueueSync, tokens, refreshQueue } = useOpsSession();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [responders, setResponders] = useState<AssignableResponder[]>([]);
  const [statusDraft, setStatusDraft] = useState<string>("OPEN");
  const [assignDraft, setAssignDraft] = useState<string>("");
  const [notifySms, setNotifySms] = useState(false);
  const [patchError, setPatchError] = useState<string | null>(null);
  const [patchLoading, setPatchLoading] = useState(false);

  useEffect(() => {
    if (queue.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !queue.some((q) => q.id === selectedId)) {
      setSelectedId(queue[0].id);
    }
  }, [queue, selectedId]);

  const selected = useMemo(() => queue.find((q) => q.id === selectedId) ?? null, [queue, selectedId]);

  useEffect(() => {
    if (!selected) return;
    setStatusDraft(selected.status?.toUpperCase() ?? "OPEN");
    setAssignDraft(selected.assigned?.id ?? selected.assignedResponderId ?? "");
  }, [selected]);

  useEffect(() => {
    const access = tokens?.accessToken;
    if (!access) return;
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const r = await fetch(`${getApiBaseUrl()}/incidents/responders-assignable`, {
          headers: { Authorization: `Bearer ${access}` },
        });
        if (!r.ok || cancelled) return;
        const json = (await r.json()) as unknown;
        if (cancelled) return;
        setResponders(Array.isArray(json) ? (json as AssignableResponder[]) : []);
      } catch {
        /* ignore — panel still usable for status-only */
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [tokens?.accessToken]);

  const patchIncident = useCallback(
    async (body: Record<string, unknown>): Promise<boolean> => {
      if (!tokens?.accessToken || !selected) return false;
      setPatchLoading(true);
      setPatchError(null);
      try {
        const res = await fetch(`${getApiBaseUrl()}/incidents/${selected.id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        const text = await res.text();
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try {
            const j = JSON.parse(text) as { message?: string | string[] };
            const m = j.message;
            msg = Array.isArray(m) ? m.join("; ") : (m ?? msg);
          } catch {
            if (text) msg = text.slice(0, 200);
          }
          setPatchError(msg);
          return false;
        }
        await refreshQueue(tokens.accessToken);
        return true;
      } catch {
        setPatchError("Network error patching incident.");
        return false;
      } finally {
        setPatchLoading(false);
      }
    },
    [selected, tokens?.accessToken, refreshQueue],
  );

  const timeline = useMemo(() => {
    const base = [...TARGET_INCIDENT_LIFECYCLE];
    const mapped = selected ? BACKEND_TO_TARGET[selected.status.toUpperCase()] ?? "pending" : "pending";
    const idx = Math.max(
      0,
      base.indexOf(mapped as (typeof TARGET_INCIDENT_LIFECYCLE)[number]),
    );
    return base.map((s, i) => ({
      id: s,
      done: i <= idx,
      current: i === idx,
    }));
  }, [selected]);

  return (
    <div className="p-4 lg:p-6 grid grid-cols-1 xl:grid-cols-12 gap-4 min-h-full">
      <aside className="xl:col-span-4 space-y-3">
        <OpsPanelCard title="Incoming SOS queue" subtitle="REST · GET /incidents/queue">
          <ul className="scroll-ops max-h-[520px] overflow-auto space-y-2 -m-1 p-1">
            {queue.map((row: OpsIncident) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className={`w-full text-left rounded-xl border px-3 py-3 transition border-l-[3px] ${
                    selectedId === row.id
                      ? "border-white/15 bg-white/[0.06] ring-1 ring-rose-500/30"
                      : "border-white/[0.06] bg-black/25 hover:border-white/10"
                  } ${incidentBorderClass(row.type)}`}
                >
                  <div className="flex justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-rose-200/90">
                      {(row.title ?? row.type.replace(/_/g, " ")).slice(0, 48)}
                    </span>
                    <span className={`shrink-0 text-[9px] uppercase px-1.5 py-0.5 rounded ${statusBadgeClass(row.status)}`}>
                      {row.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-zinc-600 truncate">{row.id}</p>
                </button>
              </li>
            ))}
            {queue.length === 0 ? (
              <li className="text-center text-xs text-zinc-600 py-16">Queue empty — stand by for SOS.</li>
            ) : null}
          </ul>
        </OpsPanelCard>
      </aside>

      <div className="xl:col-span-8 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[
            ["Prioritization", "Drag-rank queue + ML risk score (planned)", Gauge],
            ["Assignment", "PATCH /incidents/:id + responders-assignable list", Navigation],
            ["Escalate", "Multi-agency escalation path", ArrowUpCircle],
            ["Alerts", "Barangay + city broadcasts", AlarmClock],
            ["Voice bridge", "WebRTC dial-out (planned)", PhoneForwarded],
            ["Evidence locker", "Chain-of-custody uploads", Camera],
          ].map(([title, sub, Icon]) => (
            <div
              key={title as string}
              className="rounded-xl border border-white/[0.06] bg-zinc-950/60 px-4 py-3 flex gap-3"
            >
              <Icon className="h-5 w-5 text-rose-400/90 shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="text-[11px] font-semibold text-white">{title as string}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">{sub as string}</p>
              </div>
            </div>
          ))}
        </div>

        <OpsPanelCard title="Incident detail & citizen context" subtitle="Battery / signal from mobile SOS payload">
          {!selected ? (
            <p className="text-sm text-zinc-500 py-16 text-center">Select an incident card from the queue.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <LocateFixed className="h-5 w-5 text-sky-400 shrink-0" aria-hidden />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">GPS coordinates</p>
                    <p className="font-mono text-sm text-zinc-200">
                      {toNum(selected.latitude) != null && toNum(selected.longitude) != null
                        ? `${toNum(selected.latitude)!.toFixed(6)}°, ${toNum(selected.longitude)!.toFixed(6)}°`
                        : "Unknown — GSM-only fallback"}
                    </p>
                  </div>
                </div>
                {selected.assigned?.user?.email ? (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/15 px-3 py-2 text-[11px] text-emerald-100/90">
                    <span className="text-zinc-500 uppercase text-[9px] tracking-wider">Assigned unit</span>
                    <p className="mt-1 font-medium">{selected.assigned.user.email}</p>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Battery className="h-4 w-4 text-amber-300" aria-hidden />
                    Battery {selected.batteryLevel != null ? `${selected.batteryLevel}%` : "—"}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Crosshair className="h-4 w-4 text-emerald-300" aria-hidden />
                    Signal {selected.signalStrength != null ? `${selected.signalStrength}%` : "—"}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Link2 className="h-4 w-4 text-zinc-500" aria-hidden />
                    Channel {(selected.channel ?? "—").replace(/_/g, " ")}
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-black/30 p-3">
                  <UserCircle className="h-12 w-12 text-zinc-600 shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">Reporter</p>
                    <p className="text-sm text-white truncate">{selected.reporter?.email ?? "—"}</p>
                    <p className="text-xs text-zinc-500">{selected.reporter?.phone ?? "No phone on file"}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-dashed border-white/10 p-3 text-[11px] text-zinc-500">
                  <Binoculars className="inline h-4 w-4 mr-1 text-zinc-600 align-text-bottom" aria-hidden />
                  Evidence viewer: attach photos / video / documents (Media & Evidence panel). Document chain via audit
                  trail.
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3 flex items-center gap-2">
                  <History className="h-4 w-4" aria-hidden />
                  Lifecycle timeline
                </p>
                <ol className="space-y-2">
                  {timeline.map((step) => (
                    <li
                      key={step.id}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-xs ${
                        step.current
                          ? "border-rose-500/40 bg-rose-950/30 text-rose-100"
                          : step.done
                            ? "border-emerald-500/20 bg-emerald-950/15 text-emerald-200/90"
                            : "border-white/[0.05] text-zinc-600"
                      }`}
                    >
                      <Shield className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                      <span className="font-mono uppercase tracking-wide">{step.id.replace(/_/g, " ")}</span>
                      {step.current ? (
                        <span className="ml-auto text-[9px] text-rose-300">NOW</span>
                      ) : null}
                    </li>
                  ))}
                </ol>
                <p className="mt-4 text-[10px] text-zinc-600 leading-relaxed">
                  Tactical labels (left timeline) map to Prisma IncidentStatus · updates persist + BullMQ notify +
                  realtime <code className="text-zinc-500">incident_updated</code>.
                </p>

                <div className="mt-4 space-y-3 rounded-xl border border-white/[0.06] bg-black/30 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
                    Operations actions
                  </p>
                  {patchError ? (
                    <div className="text-[11px] text-rose-300 border border-rose-500/25 rounded-lg px-3 py-2">
                      {patchError}
                    </div>
                  ) : null}
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-500">
                    Prisma status
                    <select
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-white outline-none focus:border-rose-500/40 font-mono"
                      value={statusDraft}
                      onChange={(ev) => setStatusDraft(ev.target.value)}
                      disabled={patchLoading}
                    >
                      {BACKEND_INCIDENT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-500">
                    Assign responder (DB id)
                    <select
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-white outline-none focus:border-rose-500/40"
                      value={assignDraft}
                      onChange={(ev) => setAssignDraft(ev.target.value)}
                      disabled={patchLoading}
                    >
                      <option value="">— Unassigned —</option>
                      {responders.map((r) => (
                        <option key={r.id} value={r.id}>
                          {(r.badgeNumber ?? r.id.slice(0, 8)) + " · " + r.email}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifySms}
                      onChange={(e) => setNotifySms(e.target.checked)}
                      disabled={patchLoading}
                      className="rounded border-zinc-600 bg-black/60 text-rose-600 focus:ring-rose-500/30"
                    />
                    Queue outbound SMS (<code className="text-[10px] font-mono">sms-retry</code> worker)
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      disabled={patchLoading || !selected || statusDraft === selected.status.toUpperCase()}
                      onClick={() =>
                        void patchIncident({
                          status: statusDraft,
                          ...(notifySms ? { notifyReporterSms: true } : {}),
                        })
                      }
                      className="rounded-lg bg-rose-600/90 px-3 py-2 text-[11px] font-semibold text-white hover:bg-rose-500 disabled:opacity-40"
                    >
                      Update status
                    </button>
                    <button
                      type="button"
                      disabled={patchLoading || !selected}
                      onClick={() => {
                        const next =
                          assignDraft === ""
                            ? { assignedResponderId: null as null }
                            : { assignedResponderId: assignDraft };
                        void patchIncident({
                          ...next,
                          ...(notifySms ? { notifyReporterSms: true } : {}),
                        });
                      }}
                      className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-[11px] font-medium text-zinc-200 hover:bg-white/[0.1] disabled:opacity-40"
                    >
                      Save assignment
                    </button>
                    <button
                      type="button"
                      disabled={
                        patchLoading ||
                        !selected ||
                        !["CLOSED", "RESOLVED", "FALSE_ALARM"].includes(statusDraft.toUpperCase())
                      }
                      onClick={() =>
                        void patchIncident({ status: statusDraft, ...(notifySms ? { notifyReporterSms: true } : {}) })
                      }
                      className="rounded-lg border border-emerald-500/30 bg-emerald-950/35 px-3 py-2 text-[11px] text-emerald-100 disabled:opacity-40"
                    >
                      Apply terminal status
                    </button>
                    <button
                      type="button"
                      disabled={patchLoading || !selected}
                      onClick={() => void patchIncident({ notifyReporterSms: true })}
                      className="rounded-lg border border-amber-500/25 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-100 disabled:opacity-40"
                    >
                      Queue jobs only (notify + SMS prefs)
                    </button>
                  </div>
                  <p className="text-[9px] text-zinc-600 leading-relaxed">
                    CLOSED / RESOLVED / FALSE_ALARM clears the ops queue snapshot and emits{" "}
                    <code className="font-mono">incident_closed</code>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </OpsPanelCard>

        <OpsPanelCard title="Live updates" subtitle={`Last queue sync ${formatOpsSync(lastQueueSync)} — prefer Socket.IO`}>
          <p className="text-xs text-zinc-500">
            Stream mirrors command dashboard feed. Full activity log in Audit panel.
          </p>
        </OpsPanelCard>
      </div>
    </div>
  );
}
