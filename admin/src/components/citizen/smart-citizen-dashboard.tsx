"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, ChevronRight, LocateFixed, MapPin } from "lucide-react";
import { CitizenWeatherMap } from "@/components/citizen/citizen-weather-map";
import { CitizenSosRouteCard } from "@/components/citizen-sos-route-card";
import { CitizenSosVoiceLive } from "@/components/citizen-sos-voice-live";
import { CitizenSafetyBadge } from "@/components/citizen/citizen-safety-badge";
import { CitizenSosLifecycle } from "@/components/citizen/citizen-sos-lifecycle";
import { CitizenSosTransparencyModal } from "@/components/citizen/citizen-sos-transparency-modal";
import { CitizenCommunityFeed } from "@/components/citizen/citizen-community-feed";
import { CitizenPreparednessPanel } from "@/components/citizen/citizen-preparedness-panel";
import { CitizenEnterpriseStrip } from "@/components/citizen/citizen-enterprise-strip";
import {
  createDegradedCitizenFeed,
  fetchCitizenFeedWithRetry,
  isLiveCitizenFeed,
  type CitizenUnifiedFeed,
  isPublicCitizenAlert,
} from "@/lib/citizen-feed";
import { useCitizenRealtime } from "@/hooks/use-citizen-realtime";
import { getApiBaseUrl, getOpsVoiceHotline } from "@/lib/env";
import { SMART_CITIZEN_BUILD } from "@/lib/citizen-dashboard-meta";
import { defaultAgencyForType, routedAgencyLabel } from "@/lib/incident-routing";
import { IcdrrmoAiChat } from "@/components/ai/icdrrmo-ai-chat";

const SOS_TYPES = [
  { id: "MEDICAL_EMERGENCY", label: "Medical" },
  { id: "FIRE", label: "Fire" },
  { id: "FLOOD", label: "Flood" },
  { id: "TYPHOON", label: "Typhoon" },
  { id: "CRIME", label: "Crime" },
  { id: "OTHER", label: "Other" },
] as const;

type Tab = "home" | "map" | "alerts" | "community" | "prepare";

const TAB_IDS: Tab[] = ["home", "map", "alerts", "community", "prepare"];

function parseCitizenTab(raw: string | null | undefined): Tab {
  if (raw && TAB_IDS.includes(raw as Tab)) return raw as Tab;
  return "home";
}

type SosPanel = {
  incidentId: string;
  deduplicated: boolean;
  userLat: number;
  userLon: number;
  emergencyLabel: string;
  routedAgency?: string;
};

export function SmartCitizenDashboard(props: {
  accessToken: string;
  onLogout: () => void;
  initialTab?: string | null;
}): ReactElement {
  const [tab, setTab] = useState<Tab>(() => parseCitizenTab(props.initialTab));

  useEffect(() => {
    const handler = (ev: Event): void => {
      const detail = (ev as CustomEvent<{ tab?: string }>).detail;
      if (detail?.tab) setTab(parseCitizenTab(detail.tab));
    };
    window.addEventListener("icdrrmo-citizen-tab", handler);
    return () => window.removeEventListener("icdrrmo-citizen-tab", handler);
  }, []);

  useEffect(() => {
    if (props.initialTab) setTab(parseCitizenTab(props.initialTab));
  }, [props.initialTab]);
  const [feed, setFeed] = useState<CitizenUnifiedFeed>(() => createDegradedCitizenFeed());
  const [live, setLive] = useState(true);
  const [realtimeLive, setRealtimeLive] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [sosKind, setSosKind] = useState<(typeof SOS_TYPES)[number]["id"]>("MEDICAL_EMERGENCY");
  const [sosBusy, setSosBusy] = useState(false);
  const [sosPanel, setSosPanel] = useState<SosPanel | null>(null);
  const [sosTransparencyOpen, setSosTransparencyOpen] = useState(false);

  const loadFeed = useCallback(async () => {
    const coords = lat != null && lon != null ? { lat, lng: lon } : undefined;
    try {
      const f = await fetchCitizenFeedWithRetry(props.accessToken, coords, 4);
      setFeed(f);
      setLive(isLiveCitizenFeed(f));
      setErr(null);
    } catch {
      /* Keep last good feed — realtime + interval will retry silently */
    }
  }, [props.accessToken, lat, lon]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  /** Steady background refresh + realtime push — no "syncing" UI. */
  useEffect(() => {
    const id = window.setInterval(() => void loadFeed(), 45_000);
    return () => window.clearInterval(id);
  }, [loadFeed]);

  useCitizenRealtime(
    props.accessToken,
    () => {
      void loadFeed();
    },
    setRealtimeLive,
  );

  const captureLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(Number(p.coords.latitude.toFixed(7)));
        setLon(Number(p.coords.longitude.toFixed(7)));
        void loadFeed();
      },
      () => setErr("Enable GPS for nearest evacuation and alerts."),
      { enableHighAccuracy: true, timeout: 20_000 },
    );
  }, [loadFeed]);

  async function sendSos(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSosBusy(true);
    setSosPanel(null);
    try {
      let useLat = lat;
      let useLon = lon;
      if (useLat == null || useLon == null) {
        const pos = await new Promise<{ lat: number; lon: number }>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (p) =>
              resolve({
                lat: Number(p.coords.latitude.toFixed(7)),
                lon: Number(p.coords.longitude.toFixed(7)),
              }),
            () => reject(new Error("GPS required for SOS")),
            { enableHighAccuracy: true, timeout: 25_000 },
          );
        });
        useLat = pos.lat;
        useLon = pos.lon;
        setLat(pos.lat);
        setLon(pos.lon);
      }
      const res = await fetch(`${getApiBaseUrl()}/incidents/sos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${props.accessToken}`,
        },
        body: JSON.stringify({ type: sosKind, latitude: useLat, longitude: useLon }),
      });
      const body = (await res.json()) as {
        incidentId?: string;
        deduplicated?: boolean;
        routedAgency?: string;
        message?: string;
      };
      if (!res.ok) throw new Error(body.message ?? `SOS failed (${res.status})`);
      const label = SOS_TYPES.find((x) => x.id === sosKind)?.label ?? sosKind;
      setSosPanel({
        incidentId: body.incidentId!,
        deduplicated: !!body.deduplicated,
        userLat: useLat!,
        userLon: useLon!,
        emergencyLabel: label,
        routedAgency: body.routedAgency ?? defaultAgencyForType(sosKind),
      });
      setSosTransparencyOpen(true);
      void loadFeed();
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "SOS failed");
    } finally {
      setSosBusy(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "home", label: "Home" },
    { id: "map", label: "Map" },
    { id: "alerts", label: "Alerts" },
    { id: "community", label: "Community" },
    { id: "prepare", label: "Prepare" },
  ];

  const activeFeed = feed;
  const publicAlerts = useMemo(
    () => activeFeed.notifications.filter(isPublicCitizenAlert),
    [activeFeed.notifications],
  );

  return (
    <div className="space-y-4">
      {sosPanel ? (
        <CitizenSosTransparencyModal
          open={sosTransparencyOpen}
          incidentId={sosPanel.incidentId}
          accessToken={props.accessToken}
          emergencyLabel={sosPanel.emergencyLabel}
          routedAgency={sosPanel.routedAgency}
          deduplicated={sosPanel.deduplicated}
          onDone={() => setSosTransparencyOpen(false)}
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <CitizenSafetyBadge
          status={activeFeed.safetyStatus}
        />
        <span className="font-mono text-[9px] text-zinc-600">{SMART_CITIZEN_BUILD}</span>
        {live || realtimeLive ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/90">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden />
            Live
          </span>
        ) : null}
      </div>

      {err ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs text-rose-100">
          {err}
        </div>
      ) : null}

      <nav className="flex gap-1 overflow-x-auto rounded-xl bg-black/35 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-wide ${
              tab === t.id ? "bg-white/10 text-white" : "text-zinc-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "home" ? (
        <div className="space-y-4">
          <CitizenEnterpriseStrip
            enterprise={activeFeed.enterprise}
            systemHealth={activeFeed.systemHealth}
          />

          <form
            onSubmit={sendSos}
            className="rounded-2xl border border-rose-500/25 bg-gradient-to-b from-rose-950/40 to-black/55 p-4"
          >
            <select
              value={sosKind}
              onChange={(e) => setSosKind(e.target.value as (typeof SOS_TYPES)[number]["id"])}
              className="mb-3 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
            >
              {SOS_TYPES.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={sosBusy}
              className="w-full rounded-xl bg-gradient-to-b from-rose-500 to-rose-700 py-4 text-sm font-black uppercase tracking-wider text-white disabled:opacity-50"
            >
              {sosBusy ? "Sending…" : "Emergency SOS"}
            </button>
            <button
              type="button"
              onClick={captureLocation}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-[11px] text-zinc-400"
            >
              <LocateFixed className="h-3.5 w-3.5" />
              Update GPS
            </button>
          </form>

          {sosPanel ? (
            <div className="rounded-xl border border-orange-500/30 bg-orange-950/25 p-4 space-y-3">
              <p className="text-xs text-emerald-200/90" role="status">
                Report received
                {sosPanel.deduplicated ? " (existing open incident)" : ""}. Routed to{" "}
                <strong>{routedAgencyLabel(sosPanel.routedAgency)}</strong>. Confirmation sent by push, SMS, and email
                when configured.
              </p>
              <CitizenSosLifecycle
                accessToken={props.accessToken}
                incidentId={sosPanel.incidentId}
              />
              <CitizenSosRouteCard {...sosPanel} accessToken={props.accessToken} />
              <CitizenSosVoiceLive
                incidentId={sosPanel.incidentId}
                accessToken={props.accessToken}
              />
              {getOpsVoiceHotline() ? (
                <a className="text-[10px] text-rose-400 underline" href={`tel:${getOpsVoiceHotline()}`}>
                  Call ops hotline
                </a>
              ) : null}
            </div>
          ) : null}

          {activeFeed.profile ? (
            <div className="rounded-xl icd-surface p-3 text-xs text-zinc-300">
              <p className="text-[10px] uppercase tracking-widest text-orange-400/80 mb-2">
                Medical (auto-forwarded on SOS)
              </p>
              <p>
                <span className="text-zinc-500">Blood: </span>
                {activeFeed.profile.bloodType.replace(/_/g, " ")}
              </p>
              {activeFeed.profile.allergies ? (
                <p className="mt-1">
                  <span className="text-zinc-500">Allergies: </span>
                  {activeFeed.profile.allergies}
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400/90 mb-2">
              Nearest evacuation
            </p>
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {activeFeed.evacuationCenters.slice(0, 5).map((e) => (
                <li
                  key={e.id}
                  className="rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2 text-xs"
                >
                  <p className="font-semibold text-zinc-100">{e.name}</p>
                  <p className="text-zinc-500 mt-0.5">
                    {e.occupancy}/{e.capacity ?? "—"} ·{" "}
                    {e.availableSlots != null ? `${e.availableSlots} slots` : "capacity n/a"}
                    {e.distanceKm != null ? ` · ${e.distanceKm} km` : ""}
                  </p>
                  <a
                    href={e.directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[10px] text-orange-300"
                  >
                    <MapPin className="h-3 w-3" />
                    Directions
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {tab === "map" ? <CitizenWeatherMap accessToken={props.accessToken} /> : null}

      {tab === "alerts" ? (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500 flex items-center gap-2">
            <Bell className="h-4 w-4 text-orange-400" />
            Public advisories for your barangay (flood, red zone, weather, evacuation)
          </p>
          <ul className="space-y-2 max-h-[400px] overflow-y-auto">
            {publicAlerts.length ? (
              publicAlerts.map((n) => (
                <li
                  key={n.id}
                  className={`rounded-xl border px-3 py-2.5 text-xs ${
                    n.readAt ? "border-white/[0.05] opacity-70" : "border-orange-500/25 bg-orange-950/20"
                  }`}
                >
                  <p className="font-semibold text-zinc-100">{n.title}</p>
                  <p className="text-zinc-400 mt-1">{n.body}</p>
                </li>
              ))
            ) : (
              <li className="text-xs text-zinc-600 rounded-xl border border-white/[0.05] px-3 py-4 text-center">
                No public advisories right now. Your SOS status is on the Home tab.
              </li>
            )}
          </ul>
        </div>
      ) : null}

      {tab === "community" ? (
        <CitizenCommunityFeed posts={activeFeed.community} />
      ) : null}

      {tab === "prepare" ? <CitizenPreparednessPanel /> : null}

      {tab === "home" ? (
        <Link
          href="/citizen/profile"
          className="flex items-center justify-center gap-2 rounded-xl border border-orange-500/30 py-3 text-sm text-orange-100"
        >
          Full profile & emergency contacts
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}

      <IcdrrmoAiChat accessToken={props.accessToken} portal="citizen" />
    </div>
  );
}
