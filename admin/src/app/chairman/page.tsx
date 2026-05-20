"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  LogOut,
  MapPin,
  Radio,
  Send,
  Shield,
  Siren,
} from "lucide-react";
import { IcdrrmoLogo } from "@/components/icdrrmo-logo";
import { ChairmanLeafletMap } from "@/components/chairman/chairman-leaflet-map";
import {
  clearChairmanTokens,
  loadChairmanTokens,
  saveChairmanTokens,
} from "@/components/chairman/chairman-storage";
import { getApiBaseUrl } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/api-fetch";
import { opsFetchJson } from "@/lib/ops-api";
import { connectChairmanRealtime, type ChairmanIncidentPayload } from "@/lib/chairman-realtime";
import { decodeJwtPayload } from "@/lib/decode-jwt-role";
import type { TokenPair } from "@/components/ops/ops-types";

type FeedStatus = "new" | "ongoing" | "resolved";

type ChairmanIncident = {
  id: string;
  type: string;
  status: string;
  feedStatus: FeedStatus;
  urgencyLevel: string;
  title: string | null;
  description: string | null;
  latitude: number;
  longitude: number;
  createdAt: string;
  barangay: { name: string; code: string } | null;
  reporter: {
    email: string;
    phone: string | null;
    profile: { fullName: string; streetPurok: string | null } | null;
  } | null;
};

type DashboardData = {
  chairmanName: string;
  barangay: { name: string; code: string } | null;
  stats: { openCount: number; ongoingCount: number; resolvedToday: number };
  firstResponder: boolean;
};

type SystemHealth = {
  alertSystemOnline: boolean;
  database: boolean;
  pushConfigured: boolean;
  smsFallbackAvailable: boolean;
  checkedAt: string;
};

function playAlarmChime(): void {
  try {
    const AC = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 880 - i * 80;
      o.type = "square";
      const t = ctx.currentTime + i * 0.35;
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      o.start(t);
      o.stop(t + 0.3);
    }
  } catch {
    /* ignore */
  }
}

function vibrateAlarm(): void {
  try {
    if ("vibrate" in navigator) {
      navigator.vibrate([400, 120, 400, 120, 600]);
    }
  } catch {
    /* ignore */
  }
}

export default function ChairmanDashboardPage(): ReactElement {
  const router = useRouter();
  const [tokens, setTokens] = useState<TokenPair | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [incidents, setIncidents] = useState<ChairmanIncident[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [flashAlert, setFlashAlert] = useState<ChairmanIncidentPayload | null>(null);

  useEffect(() => {
    const t = loadChairmanTokens();
    if (t?.accessToken) {
      const role = decodeJwtPayload(t.accessToken)?.role;
      if (role === "BARANGAY_CHAIRMAN") setTokens(t);
      else clearChairmanTokens();
    }
  }, []);

  const selected = useMemo(
    () => incidents.find((i) => i.id === selectedId) ?? incidents[0] ?? null,
    [incidents, selectedId],
  );

  const refresh = useCallback(async (access: string) => {
    setLoading(true);
    try {
      const [dash, list, sys] = await Promise.all([
        opsFetchJson<DashboardData>("/chairman/dashboard", access),
        opsFetchJson<ChairmanIncident[]>("/chairman/incidents", access),
        opsFetchJson<SystemHealth>("/chairman/system-health", access),
      ]);
      setDashboard(dash);
      setIncidents(Array.isArray(list) ? list : []);
      setHealth(sys);
      if (!selectedId && Array.isArray(list) && list.length > 0) {
        setSelectedId(list[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    if (!tokens?.accessToken) return;
    void refresh(tokens.accessToken);
  }, [tokens?.accessToken, refresh]);

  useEffect(() => {
    if (!tokens?.accessToken) return;
    const socket = connectChairmanRealtime(tokens.accessToken, {
      onChairmanIncident: (p) => {
        setFlashAlert(p);
        playAlarmChime();
        vibrateAlarm();
        void refresh(tokens.accessToken);
      },
    });
    return () => {
      socket.close();
    };
  }, [tokens?.accessToken, refresh]);

  useEffect(() => {
    if (!flashAlert) return;
    const t = window.setTimeout(() => setFlashAlert(null), 30_000);
    return () => window.clearTimeout(t);
  }, [flashAlert]);

  async function onLogin(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoginBusy(true);
    setLoginMsg(null);
    try {
      const res = await fetchWithTimeout(`${getApiBaseUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { accessToken?: string; message?: string };
      if (!res.ok || !data.accessToken) {
        setLoginMsg(data.message ?? "Sign-in failed");
        return;
      }
      const role = decodeJwtPayload(data.accessToken)?.role;
      if (role !== "BARANGAY_CHAIRMAN") {
        setLoginMsg("This portal is for barangay chairman accounts only.");
        return;
      }
      const pair = { accessToken: data.accessToken };
      saveChairmanTokens(pair);
      setTokens(pair);
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
      if ("serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          const fcmToken = sub?.endpoint;
          if (fcmToken) {
            await fetchWithTimeout(`${getApiBaseUrl()}/chairman/me/device-token`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.accessToken}`,
              },
              body: JSON.stringify({ token: fcmToken, platform: "WEB" }),
            });
          }
        } catch {
          /* optional */
        }
      }
    } catch {
      setLoginMsg("Cannot reach API. Start backend and database, then try again.");
    } finally {
      setLoginBusy(false);
    }
  }

  async function runAction(action: "acknowledge" | "dispatch" | "resolve"): Promise<void> {
    if (!tokens?.accessToken || !selected) return;
    setActionBusy(true);
    try {
      await opsFetchJson(`/chairman/incidents/${selected.id}/action`, tokens.accessToken, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      setFlashAlert(null);
      await refresh(tokens.accessToken);
    } finally {
      setActionBusy(false);
    }
  }

  function logout(): void {
    clearChairmanTokens();
    setTokens(null);
    router.replace("/");
  }

  if (!tokens?.accessToken) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 text-zinc-100">
        <div className="w-full max-w-md rounded-2xl border border-amber-500/25 bg-zinc-950/90 p-8 shadow-panel">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-10 w-10 text-amber-400" aria-hidden />
            <div>
              <h1 className="text-lg font-semibold">Barangay Chairman</h1>
              <p className="text-xs text-zinc-500">First-responder emergency dashboard</p>
            </div>
          </div>
          <form onSubmit={(ev) => void onLogin(ev)} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm"
              required
            />
            {loginMsg ? <p className="text-xs text-rose-300">{loginMsg}</p> : null}
            <button
              type="submit"
              disabled={loginBusy}
              className="w-full rounded-xl bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
            >
              {loginBusy ? "Signing in…" : "Enter dashboard"}
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-zinc-500">
            <Link href="/" className="text-zinc-400 hover:text-white underline">
              Back to home sign-in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col text-zinc-100">
      {flashAlert ? (
        <div
          className="chairman-alert-flash sticky top-0 z-50 border-b border-rose-500/60 bg-rose-950/95 px-4 py-3 shadow-[0_0_40px_rgba(225,29,72,0.45)]"
          role="alert"
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
            <Siren className="h-6 w-6 text-rose-300 animate-pulse shrink-0" aria-hidden />
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm font-bold text-rose-100 uppercase tracking-wide">Emergency in your barangay</p>
              <p className="text-xs text-rose-200/90 mt-0.5">
                {flashAlert.type?.replace(/_/g, " ") ?? "Incident"} — you are the designated first responder. Respond
                immediately.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (flashAlert.incidentId) setSelectedId(flashAlert.incidentId);
                setFlashAlert(null);
              }}
              className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25"
            >
              View incident
            </button>
          </div>
        </div>
      ) : null}

      <header className="border-b border-white/[0.06] bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <IcdrrmoLogo size={40} className="rounded-lg" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-400/90">Barangay chairman</p>
              <h1 className="text-sm font-semibold text-white">
                {dashboard?.barangay?.name ?? "Emergency dashboard"}
              </h1>
              <p className="text-[11px] text-zinc-500">{dashboard?.chairmanName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HealthPill health={health} />
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 space-y-5">
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="New" value={dashboard?.stats.openCount ?? 0} tone="rose" />
          <StatCard label="Ongoing" value={dashboard?.stats.ongoingCount ?? 0} tone="amber" />
          <StatCard label="Resolved today" value={dashboard?.stats.resolvedToday ?? 0} tone="emerald" />
          <StatCard
            label="Role"
            value={dashboard?.firstResponder ? 1 : 0}
            tone="sky"
            display={dashboard?.firstResponder ? "1st responder" : "—"}
          />
        </section>

        {loading && incidents.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading incidents…
          </p>
        ) : null}

        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-5">
          <section className="rounded-2xl border border-white/[0.08] bg-zinc-950/70 overflow-hidden">
            <div className="border-b border-white/[0.06] px-4 py-3 flex items-center gap-2">
              <Radio className="h-4 w-4 text-amber-400" aria-hidden />
              <h2 className="text-sm font-semibold">Live incident feed</h2>
            </div>
            <ul className="max-h-[min(60vh,520px)] overflow-y-auto divide-y divide-white/[0.05]">
              {incidents.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-zinc-500">No incidents in your barangay yet.</li>
              ) : (
                incidents.map((inc) => (
                  <li key={inc.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(inc.id)}
                      className={`w-full text-left px-4 py-3 transition hover:bg-white/[0.04] ${
                        selected?.id === inc.id ? "bg-amber-950/30 border-l-2 border-amber-500" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-white">
                          {inc.type.replace(/_/g, " ")}
                        </span>
                        <FeedBadge status={inc.feedStatus} />
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        {new Date(inc.createdAt).toLocaleString("en-PH")} · {inc.urgencyLevel}
                      </p>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="space-y-4">
            {selected ? (
              <>
                <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold text-white">{selected.title ?? selected.type}</h2>
                      <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" aria-hidden />
                        {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}
                      </p>
                    </div>
                    <FeedBadge status={selected.feedStatus} large />
                  </div>
                  {selected.description ? (
                    <p className="text-sm text-zinc-400">{selected.description}</p>
                  ) : null}
                  <div className="grid sm:grid-cols-2 gap-2 text-xs">
                    <InfoRow label="Reporter" value={selected.reporter?.profile?.fullName ?? selected.reporter?.email ?? "—"} />
                    <InfoRow label="Phone" value={selected.reporter?.phone ?? "—"} />
                    <InfoRow label="Barangay" value={selected.barangay?.name ?? dashboard?.barangay?.name ?? "—"} />
                    <InfoRow label="Status" value={selected.status.replace(/_/g, " ")} />
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <ActionBtn
                      label="Acknowledge"
                      icon={CheckCircle2}
                      tone="amber"
                      disabled={actionBusy || selected.feedStatus === "resolved"}
                      onClick={() => void runAction("acknowledge")}
                    />
                    <ActionBtn
                      label="Dispatch"
                      icon={Send}
                      tone="sky"
                      disabled={actionBusy || selected.feedStatus === "resolved"}
                      onClick={() => void runAction("dispatch")}
                    />
                    <ActionBtn
                      label="Mark resolved"
                      icon={CheckCircle2}
                      tone="emerald"
                      disabled={actionBusy}
                      onClick={() => void runAction("resolve")}
                    />
                  </div>
                </div>
                <ChairmanLeafletMap
                  incidentLat={selected.latitude}
                  incidentLon={selected.longitude}
                  label={selected.type}
                />
              </>
            ) : (
              <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-10 text-center text-sm text-zinc-500">
                Select an incident from the feed.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function HealthPill({ health }: { health: SystemHealth | null }): ReactElement {
  const online = health?.alertSystemOnline;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
        online ? "bg-emerald-950/60 text-emerald-300 ring-1 ring-emerald-500/30" : "bg-rose-950/60 text-rose-300 ring-1 ring-rose-500/30"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-400" : "bg-rose-400 animate-pulse"}`} />
      Alerts {online ? "online" : "offline"}
    </span>
  );
}

function StatCard(props: {
  label: string;
  value: number;
  tone: "rose" | "amber" | "emerald" | "sky";
  display?: string;
}): ReactElement {
  const colors = {
    rose: "text-rose-300",
    amber: "text-amber-300",
    emerald: "text-emerald-300",
    sky: "text-sky-300",
  };
  return (
    <div className="rounded-xl border border-white/[0.07] bg-zinc-950/60 px-3 py-3">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{props.label}</p>
      <p className={`text-xl font-semibold mt-1 ${colors[props.tone]}`}>{props.display ?? props.value}</p>
    </div>
  );
}

function FeedBadge(props: { status: FeedStatus; large?: boolean }): ReactElement {
  const map = {
    new: "bg-rose-600/90 text-white",
    ongoing: "bg-amber-600/90 text-white",
    resolved: "bg-emerald-800/90 text-emerald-100",
  };
  return (
    <span className={`rounded-md px-2 py-0.5 font-semibold uppercase ${props.large ? "text-xs" : "text-[10px]"} ${map[props.status]}`}>
      {props.status}
    </span>
  );
}

function InfoRow(props: { label: string; value: string }): ReactElement {
  return (
    <div>
      <span className="text-zinc-600">{props.label}</span>
      <p className="text-zinc-200">{props.value}</p>
    </div>
  );
}

function ActionBtn(props: {
  label: string;
  icon: typeof Send;
  tone: "amber" | "sky" | "emerald";
  disabled?: boolean;
  onClick: () => void;
}): ReactElement {
  const Icon = props.icon;
  const tones = {
    amber: "bg-amber-600 hover:bg-amber-500",
    sky: "bg-sky-600 hover:bg-sky-500",
    emerald: "bg-emerald-600 hover:bg-emerald-500",
  };
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-40 ${tones[props.tone]}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {props.label}
    </button>
  );
}
