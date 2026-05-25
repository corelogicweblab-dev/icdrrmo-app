"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Flame, Loader2, LogOut, MapPin, Radio, Shield, Siren } from "lucide-react";
import { IcdrrmoLogo } from "@/components/icdrrmo-logo";
import { EocUnifiedMap } from "@/components/eoc/eoc-unified-map";
import { AgencyCallOverlay } from "@/components/agency/agency-call-overlay";
import {
  clearAgencyTokens,
  loadAgencyTokens,
  saveAgencyTokens,
} from "@/components/agency/agency-storage";
import {
  ackAgencyCall,
  fetchAgencyDashboard,
  fetchAgencyIncidents,
  type AgencyIncidentRow,
} from "@/lib/agency-api";
import { connectAgencyRealtime, type AgencyCallAlertPayload } from "@/lib/agency-realtime";
import { startAgencyCallAlarmLoop } from "@/lib/agency-call-alarm";
import { getApiBaseUrl } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/api-fetch";
import { decodeJwtPayload } from "@/lib/decode-jwt-role";
import { signOutToHome } from "@/lib/unified-auth";
import { useVoiceIncidentCall } from "@/hooks/use-voice-incident-call";
import type { TokenPair } from "@/components/ops/ops-types";

export type AgencyDeskConfig = {
  role: "PNP" | "BFP";
  storageKey: string;
  title: string;
  subtitle: string;
  accentClass: string;
};

export function AgencyDeskPage({ config }: { config: AgencyDeskConfig }): ReactElement {
  const [tokens, setTokens] = useState<TokenPair | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [stats, setStats] = useState<{ open: number; dispatched: number; resolvedToday: number } | null>(
    null,
  );
  const [incidents, setIncidents] = useState<AgencyIncidentRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [callAlert, setCallAlert] = useState<AgencyCallAlertPayload | null>(null);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceRoomId, setVoiceRoomId] = useState<string | null>(null);
  const socketRef = useRef<ReturnType<typeof connectAgencyRealtime> | null>(null);

  useEffect(() => {
    const t = loadAgencyTokens(config.storageKey);
    if (t?.accessToken && decodeJwtPayload(t.accessToken)?.role === config.role) {
      setTokens(t);
    } else if (t) {
      clearAgencyTokens(config.storageKey);
    }
  }, [config.storageKey, config.role]);

  const selected = useMemo(
    () => incidents.find((i) => i.id === selectedId) ?? incidents[0] ?? null,
    [incidents, selectedId],
  );

  const refresh = useCallback(
    async (access: string) => {
      setLoading(true);
      try {
        const [dash, list] = await Promise.all([
          fetchAgencyDashboard(access),
          fetchAgencyIncidents(access),
        ]);
        setStats(dash.stats);
        setIncidents(Array.isArray(list) ? list : []);
        if (!selectedId && Array.isArray(list) && list.length > 0) setSelectedId(list[0].id);
      } finally {
        setLoading(false);
      }
    },
    [selectedId],
  );

  useEffect(() => {
    if (!tokens?.accessToken) return;
    void refresh(tokens.accessToken);
  }, [tokens?.accessToken, refresh]);

  useEffect(() => {
    if (!tokens?.accessToken) return;
    const socket = connectAgencyRealtime(tokens.accessToken, {
      onAgencyIncident: () => void refresh(tokens.accessToken),
      onAgencyCallAlert: (p) => setCallAlert(p),
    });
    socketRef.current = socket;
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [tokens?.accessToken, refresh]);

  useEffect(() => {
    if (!callAlert) return;
    return startAgencyCallAlarmLoop(() => {});
  }, [callAlert]);

  const voice = useVoiceIncidentCall({
    incidentId: voiceRoomId,
    active: voiceActive && voiceRoomId != null,
    accessToken: tokens?.accessToken ?? null,
    externalSocket: socketRef.current,
  });

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
        setLoginMsg(typeof data.message === "string" ? data.message : "Sign-in failed");
        return;
      }
      if (decodeJwtPayload(data.accessToken)?.role !== config.role) {
        setLoginMsg(`This portal is for ${config.role} agency accounts only.`);
        return;
      }
      const pair = { accessToken: data.accessToken };
      saveAgencyTokens(config.storageKey, pair);
      setTokens(pair);
    } finally {
      setLoginBusy(false);
    }
  }

  function logout(): void {
    setTokens(null);
    setCallAlert(null);
    setVoiceActive(false);
    signOutToHome();
  }

  async function answerCall(): Promise<void> {
    if (!tokens?.accessToken || !callAlert) return;
    setVoiceRoomId(`agency-call:${callAlert.callId}`);
    setVoiceActive(true);
    try {
      await ackAgencyCall(tokens.accessToken, callAlert.callId);
    } catch {
      /* non-blocking */
    }
    setCallAlert(null);
  }

  if (!tokens?.accessToken) {
    return (
      <main className="min-h-screen bg-[#030303] text-white flex flex-col items-center justify-center px-4">
        <IcdrrmoLogo className="h-12 w-auto mb-6 opacity-90" />
        <h1 className="text-xl font-bold tracking-tight">{config.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">{config.subtitle}</p>
        <form onSubmit={(e) => void onLogin(e)} className="mt-8 w-full max-w-sm space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Agency email"
            className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2.5 text-sm"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2.5 text-sm"
          />
          {loginMsg ? <p className="text-xs text-rose-300">{loginMsg}</p> : null}
          <button
            type="submit"
            disabled={loginBusy}
            className={`w-full rounded-lg px-4 py-2.5 text-sm font-bold uppercase tracking-wide ${config.accentClass}`}
          >
            {loginBusy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <Link href="/" className="mt-6 text-xs text-zinc-500 hover:text-zinc-300">
          ← Unified sign-in
        </Link>
      </main>
    );
  }

  const BrandIcon = config.role === "PNP" ? Shield : Flame;

  return (
    <main className="min-h-screen bg-[#030303] text-white">
      {callAlert ? (
        <AgencyCallOverlay
          alert={callAlert}
          agencyLabel={config.title}
          onAnswer={() => void answerCall()}
          onDismiss={() => setCallAlert(null)}
        />
      ) : null}
      <header className="border-b border-white/10 bg-black/40 px-4 py-3 flex flex-wrap items-center gap-3">
        <IcdrrmoLogo className="h-8 w-auto" />
        <section className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">ICDRRMO Unified Ops</p>
          <h1 className="text-lg font-bold truncate flex items-center gap-2">
            <BrandIcon className="h-5 w-5 text-amber-400" aria-hidden />
            {config.title}
          </h1>
        </section>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-2.5 py-1 text-[10px] font-semibold text-emerald-200">
          <Radio className="h-3 w-3" aria-hidden /> Live sync
        </span>
        <Link
          href={config.role === "PNP" ? "/pnp/profile" : "/bfp/profile"}
          className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5"
        >
          Profile
        </Link>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-4 space-y-4">
        <section className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl border border-white/10 bg-black/40 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Open queue</p>
            <p className="mt-1 text-2xl font-bold flex items-center gap-2">
              <Siren className="h-5 w-5 text-amber-400 opacity-80" aria-hidden />
              {stats?.open ?? "—"}
            </p>
          </article>
          <article className="rounded-xl border border-white/10 bg-black/40 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Dispatched</p>
            <p className="mt-1 text-2xl font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-amber-400 opacity-80" aria-hidden />
              {stats?.dispatched ?? "—"}
            </p>
          </article>
          <article className="rounded-xl border border-white/10 bg-black/40 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Resolved today</p>
            <p className="mt-1 text-2xl font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-400 opacity-80" aria-hidden />
              {stats?.resolvedToday ?? "—"}
            </p>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-12">
          <aside className="lg:col-span-4 space-y-2 max-h-[520px] overflow-y-auto">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">
              Forwarded incidents ({config.role === "PNP" ? "crime / police" : "fire"})
            </p>
            {loading ? (
              <p className="text-sm text-zinc-500 flex items-center gap-2 px-1">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </p>
            ) : incidents.length === 0 ? (
              <p className="text-sm text-zinc-600 px-1">No open incidents in your agency queue.</p>
            ) : (
              incidents.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => setSelectedId(i.id)}
                  className={`w-full text-left rounded-xl border px-3 py-2.5 text-xs transition ${
                    selected?.id === i.id
                      ? "border-amber-500/50 bg-amber-950/25"
                      : "border-white/10 bg-black/30 hover:border-white/20"
                  }`}
                >
                  <p className="font-semibold text-white">{i.type.replace(/_/g, " ")}</p>
                  <p className="text-zinc-500 mt-0.5">
                    {i.barangay?.name ?? "—"} · {i.status}
                  </p>
                </button>
              ))
            )}
          </aside>
          <section className="lg:col-span-8 space-y-3">
            <section className="h-[360px] rounded-xl overflow-hidden border border-white/10">
              <EocUnifiedMap
                mode="ops"
                accessToken={tokens.accessToken}
                className="h-full w-full"
              />
            </section>
            {selected ? (
              <article className="rounded-xl border border-white/10 bg-black/40 p-4 text-sm">
                <p className="font-bold">{selected.title ?? selected.type}</p>
                <p className="text-zinc-400 mt-1 text-xs">{selected.description ?? "No description"}</p>
                <p className="mt-2 font-mono text-[11px] text-zinc-500">ID {selected.id}</p>
                {voiceActive && voiceRoomId ? (
                  <p className="mt-2 text-[11px] text-emerald-300">Voice bridge: {voice.status}</p>
                ) : null}
              </article>
            ) : null}
          </section>
        </section>
      </section>
    </main>
  );
}
