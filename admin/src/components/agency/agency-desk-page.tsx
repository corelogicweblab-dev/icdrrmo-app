"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin, Shield, Siren } from "lucide-react";
import { AgencyCallOverlay } from "@/components/agency/agency-call-overlay";
import { useSetAgencyChromeBridge } from "@/components/agency/agency-chrome-bridge";
import { useAgencySession } from "@/components/agency/agency-session-context";
import { EocUnifiedMap } from "@/components/eoc/eoc-unified-map";
import {
  ackAgencyCall,
  fetchAgencyDashboard,
  fetchAgencyIncidents,
  type AgencyIncidentRow,
} from "@/lib/agency-api";
import { connectAgencyRealtime, type AgencyCallAlertPayload } from "@/lib/agency-realtime";
import { startAgencyCallAlarmLoop } from "@/lib/agency-call-alarm";
import { OpsKpiCard, OpsPanelCard } from "@/components/ops/ops-widgets";
import { useVoiceIncidentCall } from "@/hooks/use-voice-incident-call";

export function AgencyDeskPage(): ReactElement {
  const { config, tokens } = useAgencySession();
  const setBridge = useSetAgencyChromeBridge();
  const access = tokens.accessToken;

  const [stats, setStats] = useState<{ open: number; dispatched: number; resolvedToday: number } | null>(
    null,
  );
  const [incidents, setIncidents] = useState<AgencyIncidentRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socketLive, setSocketLive] = useState(false);
  const [callAlert, setCallAlert] = useState<AgencyCallAlertPayload | null>(null);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceRoomId, setVoiceRoomId] = useState<string | null>(null);
  const socketRef = useRef<ReturnType<typeof connectAgencyRealtime> | null>(null);

  const selected = useMemo(
    () => incidents.find((i) => i.id === selectedId) ?? incidents[0] ?? null,
    [incidents, selectedId],
  );

  const refresh = useCallback(async () => {
    if (!access) return;
    setLoading(true);
    try {
      const [dash, list] = await Promise.all([
        fetchAgencyDashboard(access),
        fetchAgencyIncidents(access),
      ]);
      setStats(dash.stats);
      const rows = Array.isArray(list) ? list : [];
      setIncidents(rows);
      setSelectedId((prev) => {
        if (prev && rows.some((r) => r.id === prev)) return prev;
        return rows[0]?.id ?? null;
      });
    } finally {
      setLoading(false);
    }
  }, [access]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!access) return;
    const socket = connectAgencyRealtime(access, {
      onAgencyIncident: () => void refresh(),
      onAgencyCallAlert: (p) => setCallAlert(p),
    });
    const onUp = (): void => setSocketLive(true);
    const onDown = (): void => setSocketLive(false);
    socket.on("connect", onUp);
    socket.on("disconnect", onDown);
    socketRef.current = socket;
    return () => {
      socket.off("connect", onUp);
      socket.off("disconnect", onDown);
      socket.close();
      socketRef.current = null;
      setSocketLive(false);
    };
  }, [access, refresh]);

  useEffect(() => {
    setBridge({
      socketLive,
      openCount: stats?.open ?? incidents.length,
      loading,
      onRefresh: () => void refresh(),
    });
  }, [setBridge, socketLive, stats?.open, incidents.length, loading, refresh]);

  useEffect(() => {
    if (!callAlert) return;
    return startAgencyCallAlarmLoop(() => {});
  }, [callAlert]);

  const voice = useVoiceIncidentCall({
    incidentId: voiceRoomId,
    active: voiceActive && voiceRoomId != null,
    accessToken: access,
    externalSocket: socketRef.current,
  });

  async function answerCall(): Promise<void> {
    if (!access || !callAlert) return;
    setVoiceRoomId(`agency-call:${callAlert.callId}`);
    setVoiceActive(true);
    try {
      await ackAgencyCall(access, callAlert.callId);
    } catch {
      /* non-blocking */
    }
    setCallAlert(null);
  }

  return (
    <div className="p-4 lg:p-6 grid gap-4 lg:grid-cols-12">
      {callAlert ? (
        <div className="lg:col-span-12">
          <AgencyCallOverlay
            alert={callAlert}
            agencyLabel={config.portalTitle}
            onAnswer={() => void answerCall()}
            onDismiss={() => setCallAlert(null)}
          />
        </div>
      ) : null}

      <div className="lg:col-span-12 grid gap-3 sm:grid-cols-3">
        <OpsKpiCard
          icon={Siren}
          label="Open queue"
          value={stats?.open != null ? String(stats.open) : "—"}
          subtitle="Awaiting agency action"
          accent="amber"
        />
        <OpsKpiCard
          icon={MapPin}
          label="Dispatched"
          value={stats?.dispatched != null ? String(stats.dispatched) : "—"}
          subtitle="Units en route or on scene"
          accent="rose"
        />
        <OpsKpiCard
          icon={Shield}
          label="Resolved today"
          value={stats?.resolvedToday != null ? String(stats.resolvedToday) : "—"}
          subtitle="Closed in the last 24h"
          accent="emerald"
        />
      </div>

      <OpsPanelCard
        title={config.incidentQueueLabel}
        subtitle="Select a row to view details on the map"
        className="lg:col-span-4"
      >
        {loading ? (
          <p className="text-sm text-zinc-500 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
          </p>
        ) : incidents.length === 0 ? (
          <p className="text-sm text-zinc-600">No open incidents in your agency queue.</p>
        ) : (
          <ul className="space-y-2 max-h-[480px] overflow-y-auto scroll-ops">
            {incidents.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(i.id)}
                  className={`w-full text-left rounded-lg border px-3 py-2.5 text-xs transition ${
                    selected?.id === i.id
                      ? "border-orange-500/45 bg-orange-950/25"
                      : "border-orange-500/12 bg-black/30 hover:border-orange-500/25"
                  }`}
                >
                  <p className="font-semibold text-white">{i.type.replace(/_/g, " ")}</p>
                  <p className="text-zinc-500 mt-0.5">
                    {i.barangay?.name ?? "—"} · {i.status}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </OpsPanelCard>

      <div className="lg:col-span-8 space-y-4">
        <OpsPanelCard title="Operations map" subtitle="EOC unified GIS — agency view">
          <div className="h-[360px] rounded-lg overflow-hidden border border-orange-500/12">
            <EocUnifiedMap mode="ops" accessToken={access} className="h-full w-full" />
          </div>
        </OpsPanelCard>

        {selected ? (
          <OpsPanelCard title="Incident detail" subtitle={selected.id}>
            <p className="font-bold text-white">{selected.title ?? selected.type}</p>
            <p className="text-zinc-400 mt-1 text-xs">{selected.description ?? "No description"}</p>
            <p className="mt-2 font-mono text-[11px] text-zinc-500">
              {selected.barangay?.name ?? "—"} · {selected.status}
            </p>
            {voiceActive && voiceRoomId ? (
              <p className="mt-2 text-[11px] text-emerald-300">Voice bridge: {voice.status}</p>
            ) : null}
          </OpsPanelCard>
        ) : null}
      </div>
    </div>
  );
}
