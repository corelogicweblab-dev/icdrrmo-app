"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlarmClock,
  ArrowUpCircle,
  Battery,
  Binoculars,
  Camera,
  Copy,
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
import {
  formatOpsSync,
  humanIncidentStatus,
  incidentBorderClass,
  statusBadgeClass,
} from "@/components/ops/ops-format";
import type { OpsIncident } from "@/components/ops/ops-types";
import { CitizenSosRouteCard } from "@/components/citizen-sos-route-card";
import { OpsIncidentVoicePanel } from "@/components/ops-incident-voice-panel";
import { OpsPanelCard } from "@/components/ops/ops-widgets";
import { EMERGENCY_TYPES } from "@/lib/icdrrmo-constants";
import { opsFetchJson, OpsApiError } from "@/lib/ops-api";
import { API_INCIDENTS_QUEUE_PATH, API_INCIDENTS_RESPONDERS_ASSIGNABLE_PATH } from "@/lib/ops-api-paths";
import { ISABELA_EOC_LAT, ISABELA_EOC_LNG } from "@/lib/isabela-eoc";

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
  const router = useRouter();
  const { queue, lastQueueSync, tokens, refreshQueue, realtimeSocket, socketState } = useOpsSession();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [responders, setResponders] = useState<AssignableResponder[]>([]);
  const [statusDraft, setStatusDraft] = useState<string>("OPEN");
  const [assignDraft, setAssignDraft] = useState<string>("");
  const [notifySms, setNotifySms] = useState(false);
  const [patchError, setPatchError] = useState<string | null>(null);
  const [patchLoading, setPatchLoading] = useState(false);

  const [barangays, setBarangays] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [cType, setCType] = useState<string>("MEDICAL_EMERGENCY");
  const [cLat, setCLat] = useState(String(ISABELA_EOC_LAT));
  const [cLng, setCLng] = useState(String(ISABELA_EOC_LNG));
  const [cTitle, setCTitle] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [cBarangay, setCBarangay] = useState("");
  const [cStatus, setCStatus] = useState("OPEN");
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const lastFocusScrollRef = useRef<string | null>(null);
  /** One-shot from ?voiceAnswer=1 after answering the SOS voice ring overlay. */
  const [autoJoinVoiceOnce, setAutoJoinVoiceOnce] = useState(false);
  const pendingVoiceAnswerRef = useRef(false);

  useEffect(() => {
    if (queue.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !queue.some((q) => q.id === selectedId)) {
      setSelectedId(queue[0].id);
    }
  }, [queue, selectedId]);

  /** Deep link: /ops/incidents?focus=<incidentId> (notifications, shared links). */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("focus");
    if (!id || !queue.some((q) => q.id === id)) return;
    setSelectedId(id);
    if (lastFocusScrollRef.current === id) return;
    lastFocusScrollRef.current = id;
    requestAnimationFrame(() => {
      document.getElementById("ops-incident-detail")?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }, [queue]);

  /** Strip voiceAnswer=1 from URL once the focused incident is selected (auto-opens voice panel). */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("voiceAnswer") !== "1") return;
    const focus = sp.get("focus");
    if (!focus || selectedId !== focus) return;
    pendingVoiceAnswerRef.current = true;
    setAutoJoinVoiceOnce(true);
    sp.delete("voiceAnswer");
    const q = sp.toString();
    router.replace(q ? `/ops/incidents?${q}` : "/ops/incidents", { scroll: false });
  }, [selectedId, router]);

  useEffect(() => {
    if (pendingVoiceAnswerRef.current) {
      pendingVoiceAnswerRef.current = false;
      return;
    }
    setAutoJoinVoiceOnce(false);
  }, [selectedId]);

  const openIncident = useCallback(
    (id: string) => {
      setSelectedId(id);
      router.replace(`/ops/incidents?focus=${encodeURIComponent(id)}`, { scroll: false });
      requestAnimationFrame(() => {
        document.getElementById("ops-incident-detail")?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });
    },
    [router],
  );

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
      const token = access;
      if (!token) return;
      try {
        const json = await opsFetchJson<AssignableResponder[]>(API_INCIDENTS_RESPONDERS_ASSIGNABLE_PATH, token);
        if (cancelled) return;
        setResponders(Array.isArray(json) ? json : []);
      } catch {
        /* ignore — panel still usable for status-only */
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [tokens?.accessToken]);

  useEffect(() => {
    const access = tokens?.accessToken;
    if (!access) return;
    let cancelled = false;
    (async () => {
      const token = access;
      if (!token) return;
      try {
        const json = await opsFetchJson<Array<{ id: string; name: string; code: string }>>("/barangays", token);
        if (!cancelled) setBarangays(Array.isArray(json) ? json : []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokens?.accessToken]);

  const createIncident = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setCreateBusy(true);
    setCreateErr(null);
    const lat = Number(cLat);
    const lng = Number(cLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setCreateErr("Latitude and longitude must be valid numbers.");
      setCreateBusy(false);
      return;
    }
    try {
      await opsFetchJson("/incidents/ops", tokens.accessToken, {
        method: "POST",
        body: JSON.stringify({
          type: cType,
          latitude: lat,
          longitude: lng,
          title: cTitle.trim() || undefined,
          description: cDesc.trim() || undefined,
          barangayId: cBarangay || undefined,
          status: cStatus,
        }),
      });
      await refreshQueue(tokens.accessToken);
      setCTitle("");
      setCDesc("");
    } catch (e: unknown) {
      setCreateErr(e instanceof OpsApiError ? e.body?.slice(0, 240) ?? e.message : "Network error creating incident.");
    } finally {
      setCreateBusy(false);
    }
  }, [
    tokens?.accessToken,
    cType,
    cLat,
    cLng,
    cTitle,
    cDesc,
    cBarangay,
    cStatus,
    refreshQueue,
  ]);

  const copyDispatchBrief = useCallback(async () => {
    if (!selected) return;
    setPatchError(null);
    const lat = toNum(selected.latitude);
    const lng = toNum(selected.longitude);
    const gmaps =
      lat != null && lng != null
        ? `https://www.google.com/maps/dir/${ISABELA_EOC_LAT},${ISABELA_EOC_LNG}/${lat},${lng}`
        : "";
    const waze =
      lat != null && lng != null
        ? `https://waze.com/ul?ll=${encodeURIComponent(String(lat))},${encodeURIComponent(String(lng))}&navigate=yes`
        : "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const assignEmail =
      selected.assigned?.user?.email ??
      (assignDraft ? responders.find((r) => r.id === assignDraft)?.email : undefined);
    const text = [
      "ICDRRMO DISPATCH BRIEF",
      `Incident: ${selected.id}`,
      `Type: ${selected.type}`,
      `Status: ${selected.status}`,
      `Reporter: ${selected.reporter?.email ?? "—"}`,
      `Phone: ${selected.reporter?.phone ?? "—"}`,
      `GPS: ${lat ?? "—"}, ${lng ?? "—"}`,
      `Responder (assignment draft): ${assignEmail ?? (assignDraft || "unassigned")}`,
      `Google Maps (EOC→scene): ${gmaps || "—"}`,
      `Waze (navigate): ${waze || "—"}`,
      `Ops deep link: ${origin}/ops/incidents?focus=${encodeURIComponent(selected.id)}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setPatchError("Could not copy to clipboard (HTTPS / permission).");
    }
  }, [selected, assignDraft, responders]);

  const patchIncident = useCallback(
    async (body: Record<string, unknown>): Promise<boolean> => {
      if (!tokens?.accessToken || !selected) return false;
      setPatchLoading(true);
      setPatchError(null);
      try {
        await opsFetchJson(`/incidents/${selected.id}`, tokens.accessToken, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        await refreshQueue(tokens.accessToken);
        return true;
      } catch (e: unknown) {
        setPatchError(
          e instanceof OpsApiError ? e.body?.slice(0, 240) ?? e.message : "Network error patching incident.",
        );
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
        <OpsPanelCard
          title="Incoming SOS queue"
          subtitle={`Nest JSON · GET ${API_INCIDENTS_QUEUE_PATH} (under /api/v1/incidents — not static files)`}
        >
          <ul className="scroll-ops max-h-[520px] overflow-auto space-y-2 -m-1 p-1">
            {queue.map((row: OpsIncident) => (
              <li key={row.id}>
                <div
                  className={`w-full text-left rounded-xl border px-3 py-3 transition border-l-[3px] ${
                    selectedId === row.id
                      ? "border-white/15 bg-white/[0.06] ring-1 ring-rose-500/30"
                      : "border-white/[0.06] bg-black/25"
                  } ${incidentBorderClass(row.type)}`}
                >
                  <div className="flex justify-between gap-2 items-start">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-rose-200/90">
                      {(row.title ?? row.type.replace(/_/g, " ")).slice(0, 48)}
                    </span>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className="text-[8px] font-semibold uppercase tracking-wider text-zinc-500">Status</span>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded ${statusBadgeClass(row.status)}`}
                        title="Incident workflow status (not an action button)"
                      >
                        {humanIncidentStatus(row.status)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 font-mono text-[10px] text-zinc-600 truncate" title={row.id}>
                    {row.id}
                  </p>
                  <button
                    type="button"
                    onClick={() => openIncident(row.id)}
                    className="mt-3 w-full rounded-lg bg-rose-600/90 px-3 py-2.5 text-center text-[11px] font-semibold text-white hover:bg-rose-500 focus-visible:outline focus-visible:ring-2 focus-visible:ring-rose-400/60"
                  >
                    View detail, reporter & EOC route
                  </button>
                </div>
              </li>
            ))}
            {queue.length === 0 ? (
              <li className="text-center text-xs text-zinc-600 py-16">Queue empty — stand by for SOS.</li>
            ) : null}
          </ul>
        </OpsPanelCard>
      </aside>

      <div className="xl:col-span-8 space-y-4">
        <OpsPanelCard title="Create incident (EOC)" subtitle="POST /incidents/ops · ADMIN channel">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-[10px] uppercase text-zinc-500">
              Type
              <select
                value={cType}
                onChange={(e) => setCType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-2 py-2 text-sm text-white"
              >
                {EMERGENCY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[10px] uppercase text-zinc-500">
              Latitude
              <input
                value={cLat}
                onChange={(e) => setCLat(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-2 py-2 text-sm font-mono text-white"
              />
            </label>
            <label className="block text-[10px] uppercase text-zinc-500">
              Longitude
              <input
                value={cLng}
                onChange={(e) => setCLng(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-2 py-2 text-sm font-mono text-white"
              />
            </label>
            <label className="block text-[10px] uppercase text-zinc-500 sm:col-span-2">
              Title (optional)
              <input
                value={cTitle}
                onChange={(e) => setCTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-2 py-2 text-sm text-white"
              />
            </label>
            <label className="block text-[10px] uppercase text-zinc-500">
              Initial status
              <select
                value={cStatus}
                onChange={(e) => setCStatus(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-2 py-2 text-sm text-white"
              >
                {["OPEN", "ACKNOWLEDGED", "DISPATCHED", "IN_PROGRESS"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[10px] uppercase text-zinc-500 sm:col-span-2">
              Barangay (optional)
              <select
                value={cBarangay}
                onChange={(e) => setCBarangay(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-2 py-2 text-sm text-white"
              >
                <option value="">—</option>
                {barangays.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[10px] uppercase text-zinc-500 sm:col-span-3">
              Description
              <textarea
                value={cDesc}
                onChange={(e) => setCDesc(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-2 py-2 text-sm text-white"
              />
            </label>
          </div>
          {createErr ? <p className="mt-2 text-xs text-rose-300">{createErr}</p> : null}
          <button
            type="button"
            disabled={createBusy}
            onClick={() => void createIncident()}
            className="mt-3 rounded-lg bg-rose-600/90 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-40"
          >
            {createBusy ? "Creating…" : "Create incident"}
          </button>
        </OpsPanelCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[
            ["Prioritization", "Drag-rank queue + ML risk score (planned)", Gauge],
            ["Assignment", "PATCH /incidents/:id + responders-assignable list", Navigation],
            ["Escalate", "Multi-agency escalation path", ArrowUpCircle],
            ["Alerts", "Barangay + city broadcasts", AlarmClock],
            ["Voice bridge", "Browser WebRTC room per incident (Join live voice)", PhoneForwarded],
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

        <OpsPanelCard
          id="ops-incident-detail"
          title="Incident detail & citizen context"
          subtitle="Battery / signal from mobile SOS payload"
        >
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
                {toNum(selected.latitude) != null && toNum(selected.longitude) != null ? (
                  <CitizenSosRouteCard
                    incidentId={selected.id}
                    deduplicated={false}
                    userLat={toNum(selected.latitude)!}
                    userLon={toNum(selected.longitude)!}
                    emergencyLabel={`${selected.type.replace(/_/g, " ")}${selected.title ? ` · ${selected.title}` : ""}`}
                  />
                ) : (
                  <p className="text-xs text-zinc-500 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                    No GPS fix on this incident — EOC routing unavailable.
                  </p>
                )}
                <OpsIncidentVoicePanel
                  incidentId={selected.id}
                  realtimeSocket={realtimeSocket}
                  socketLive={socketState === "live"}
                  autoJoinVoice={autoJoinVoiceOnce}
                />
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
                      disabled={!selected}
                      onClick={() => void copyDispatchBrief()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-950/30 px-3 py-2 text-[11px] font-medium text-sky-100 hover:bg-sky-950/50 disabled:opacity-40"
                    >
                      <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      Copy dispatch brief
                    </button>
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
