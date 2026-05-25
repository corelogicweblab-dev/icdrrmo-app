"use client";

import type { ReactElement, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Socket } from "socket.io-client";
import { ApiTimeoutError, fetchWithTimeout } from "@/lib/api-fetch";
import { getApiBaseUrl, getApiConfigWarning, getHealthCheckUrl } from "@/lib/env";
import { API_INCIDENTS_QUEUE_PATH } from "@/lib/ops-api-paths";
import { opsFetchJson, OpsApiError } from "@/lib/ops-api";
import { connectOpsRealtime, type IncidentCreatedPayload } from "@/lib/realtime";
import { signOutToHome } from "@/lib/unified-auth";
import { OpsChrome } from "@/components/ops/ops-chrome";
import { OpsLoginView } from "@/components/ops/ops-login";
import {
  loadOpsTokens,
  loadSoundMuted,
  saveOpsTokens,
  saveSoundMuted,
} from "@/components/ops/ops-storage";
import type { OpsIncident, TokenPair } from "@/components/ops/ops-types";

/** Citizen entered the WebRTC voice room — ops UI should surface Answer/Cancel. */
export type VoiceIncidentRingPayload = {
  incidentId: string;
  reporterId: string;
  at: string;
};

function playIncidentChime(): void {
  try {
    type WinAudio = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    const w = window as WinAudio;
    const AC = AudioContext ?? w.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 932;
    o.type = "square";
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.23);
  } catch {
    /* ignored */
  }
}

export type OpsSessionContextValue = {
  tokens: TokenPair | null;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  logout: () => void;
  /** Shared Socket.IO client for `/realtime` (incidents feed + incident voice signaling). */
  realtimeSocket: Socket | null;
  socketState: "off" | "live" | "error";
  wsErrorDetail: string | null;
  feed: string[];
  queue: OpsIncident[];
  queueError: string | null;
  queueLoading: boolean;
  refreshQueue: (access: string) => Promise<void>;
  apiReachable: boolean | null;
  lastHealthAt: Date | null;
  lastQueueSync: Date | null;
  lastSocketAt: Date | null;
  now: Date;
  loginError: string | null;
  soundMuted: boolean;
  setSoundMuted: (v: boolean) => void;
  /** Incoming citizen voice ring (server `voice_incident_ring`). */
  voiceRing: VoiceIncidentRingPayload | null;
  dismissVoiceRing: () => void;
  /** Active incident for EOC direct-call strip (set from Live incidents desk). */
  callFocusIncidentId: string | null;
  setCallFocusIncidentId: (id: string | null) => void;
};

const OpsSessionContext = createContext<OpsSessionContextValue | null>(null);

export function useOpsSession(): OpsSessionContextValue {
  const v = useContext(OpsSessionContext);
  if (!v) throw new Error("useOpsSession must be used under OpsSessionProvider");
  return v;
}

export function OpsSessionProvider({ children }: { children: ReactNode }): ReactElement {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tokens, setTokens] = useState<TokenPair | null>(null);
  const [socketState, setSocketState] = useState<"off" | "live" | "error">("off");
  const [feed, setFeed] = useState<string[]>([]);
  const [queue, setQueue] = useState<OpsIncident[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [loginError, setLoginError] = useState<string | null>(null);
  const [apiReachable, setApiReachable] = useState<boolean | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [wsErrorDetail, setWsErrorDetail] = useState<string | null>(null);
  const [lastQueueSync, setLastQueueSync] = useState<Date | null>(null);
  const [lastHealthAt, setLastHealthAt] = useState<Date | null>(null);
  const [lastSocketAt, setLastSocketAt] = useState<Date | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [soundMuted, setSoundMutedState] = useState(false);
  const [booted, setBooted] = useState(false);
  const [apiConfigWarning, setApiConfigWarning] = useState<string | null>(null);
  const [realtimeSocket, setRealtimeSocket] = useState<Socket | null>(null);
  const [voiceRing, setVoiceRing] = useState<VoiceIncidentRingPayload | null>(null);
  const [callFocusIncidentId, setCallFocusIncidentId] = useState<string | null>(null);

  useEffect(() => {
    setTokens(loadOpsTokens());
    setSoundMutedState(loadSoundMuted());
    setBooted(true);
  }, []);

  useEffect(() => {
    setApiConfigWarning(getApiConfigWarning());
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const setSoundMuted = useCallback((muted: boolean) => {
    setSoundMutedState(muted);
    saveSoundMuted(muted);
  }, []);

  const dismissVoiceRing = useCallback((): void => {
    setVoiceRing(null);
  }, []);

  const refreshQueue = useCallback(async (access: string) => {
    setQueueLoading(true);
    try {
      const data = await opsFetchJson<OpsIncident[]>(API_INCIDENTS_QUEUE_PATH, access);
      setQueueError(null);
      setQueue(Array.isArray(data) ? data : []);
      setLastQueueSync(new Date());
    } catch (e: unknown) {
      if (e instanceof OpsApiError) {
        if (e.status === 401) {
          setQueueError("Session expired. Sign in again.");
          return;
        }
        if (e.status === 403) {
          setQueueError("Insufficient permissions. Operations queue requires Admin or Operator role.");
          return;
        }
        setQueueError(`The incident queue is temporarily unavailable (error ${e.status}). Try again or contact support.`);
        return;
      }
      setQueueError("Unable to reach the incident queue. Confirm the API is online.");
    } finally {
      setQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!tokens?.accessToken) return;
    let cancelled = false;
    async function ping(): Promise<void> {
      try {
        const r = await fetch(getHealthCheckUrl(), { method: "GET" });
        if (!cancelled) {
          setApiReachable(r.ok);
          if (r.ok) setLastHealthAt(new Date());
        }
      } catch {
        if (!cancelled) setApiReachable(false);
      }
    }
    void ping();
    const id = setInterval(() => void ping(), 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [tokens?.accessToken]);

  useEffect(() => {
    if (!tokens?.accessToken) {
      setRealtimeSocket(null);
      return;
    }
    void refreshQueue(tokens.accessToken);
    const socket: Socket = connectOpsRealtime(tokens.accessToken, {
      onIncidentCreated: (p: IncidentCreatedPayload) => {
        setFeed((f) =>
          [`${new Date().toISOString()} · INCIDENT_CREATED · ${p.incidentId}`, ...f].slice(0, 80),
        );
        if (!loadSoundMuted()) playIncidentChime();
        const lat = p.latitude != null ? Number(p.latitude) : NaN;
        const lng = p.longitude != null ? Number(p.longitude) : NaN;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setQueue((prev) => {
            if (prev.some((i) => i.id === p.incidentId)) return prev;
            const optimistic: OpsIncident = {
              id: p.incidentId,
              type: p.type ?? "UNKNOWN",
              status: "OPEN",
              createdAt: new Date().toISOString(),
              latitude: lat,
              longitude: lng,
              title: p.title ?? undefined,
              channel: "MOBILE_APP",
              reporter: null,
            };
            return [optimistic, ...prev];
          });
        }
        void refreshQueue(tokens.accessToken);
      },
      onIncidentUpdated: (p) => {
        const st = p.status ? ` · ${p.status}` : "";
        setFeed((f) =>
          [`${new Date().toISOString()} · INCIDENT_UPDATED · ${p.incidentId}${st}`, ...f].slice(0, 80),
        );
        void refreshQueue(tokens.accessToken);
      },
      onConnectError: (err: Error) => {
        setSocketState("error");
        setWsErrorDetail(err.message || "Connection failed");
      },
    });
    setRealtimeSocket(socket);
    const onVoiceIncidentRing = (raw: unknown): void => {
      const p = raw as { incidentId?: string; reporterId?: string; at?: string };
      if (!p?.incidentId) return;
      setVoiceRing({
        incidentId: p.incidentId,
        reporterId: typeof p.reporterId === "string" ? p.reporterId : "",
        at: typeof p.at === "string" ? p.at : new Date().toISOString(),
      });
      if (!loadSoundMuted()) playIncidentChime();
    };
    socket.on("voice_incident_ring", onVoiceIncidentRing);
    socket.on("connect", () => {
      setSocketState("live");
      setWsErrorDetail(null);
      setLastSocketAt(new Date());
    });
    socket.on("disconnect", () => setSocketState("off"));
    return () => {
      setRealtimeSocket(null);
      socket.off("voice_incident_ring", onVoiceIncidentRing);
      socket.removeAllListeners();
      socket.close();
    };
  }, [tokens, refreshQueue]);

  async function login(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoginError(null);
    const url = `${getApiBaseUrl()}/auth/login`;
    try {
      const res = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const raw = await res.text();
        let detail = raw;
        try {
          const j = JSON.parse(raw) as { message?: string | string[] };
          if (typeof j.message === "string") detail = j.message;
          else if (Array.isArray(j.message)) detail = j.message.join("; ");
        } catch {
          if (raw) detail = raw.slice(0, 280);
        }
        if (res.status === 404) {
          setLoginError(
            "Sign-in service was not found. Contact your technical administrator if this continues.",
          );
        } else if (res.status === 400) {
          setLoginError(`Sign-in could not be completed. ${detail}`);
        } else if (res.status === 401) {
          setLoginError(detail || "Incorrect email or password, or this account is not enabled for this console.");
        } else {
          setLoginError(`Sign-in failed (${res.status}). ${detail}`);
        }
        setFeed((f) =>
          [`${new Date().toISOString()} · AUTH_FAILURE · ${res.status}`, ...f].slice(0, 80),
        );
        return;
      }
      const raw = (await res.json()) as { accessToken?: string; refreshToken?: string };
      const pair: TokenPair = {
        accessToken: raw.accessToken ?? "",
        ...(raw.refreshToken ? { refreshToken: raw.refreshToken } : {}),
      };
      if (!pair.accessToken) {
        setLoginError("Login response missing accessToken.");
        return;
      }
      saveOpsTokens(pair);
      setTokens(pair);
      setQueueError(null);
      setFeed((f) => [`${new Date().toISOString()} · SESSION_ESTABLISHED`, ...f].slice(0, 80));
    } catch (err: unknown) {
      const api = getApiBaseUrl();
      const detail =
        err instanceof ApiTimeoutError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Network error";
      const mixed =
        typeof window !== "undefined" &&
        window.location.protocol === "https:" &&
        api.startsWith("http:");
      const onLocal =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
      setLoginError(
        mixed
          ? "This page uses a secure connection, but the emergency services link may need to use HTTPS as well. Contact your technical administrator."
          : onLocal
            ? `Cannot reach the API (${detail}). Run npm run db:setup, then npm run dev:api and npm run dev:admin.`
            : `Cannot reach the emergency services server (${detail}). Check your connection or try again later.`,
      );
      setFeed((f) => [`${new Date().toISOString()} · AUTH_NETWORK_ERROR`, ...f].slice(0, 80));
    }
  }

  const logout = useCallback((): void => {
    setRealtimeSocket((s) => {
      s?.disconnect();
      return null;
    });
    signOutToHome();
  }, []);

  const ctx = useMemo<OpsSessionContextValue>(
    () => ({
      tokens,
      email,
      setEmail,
      password,
      setPassword,
      logout,
      realtimeSocket,
      socketState,
      wsErrorDetail,
      feed,
      queue,
      queueError,
      queueLoading,
      refreshQueue,
      apiReachable,
      lastHealthAt,
      lastQueueSync,
      lastSocketAt,
      now,
      loginError,
      soundMuted,
      setSoundMuted,
      voiceRing,
      dismissVoiceRing,
      callFocusIncidentId,
      setCallFocusIncidentId,
    }),
    [
      tokens,
      email,
      password,
      logout,
      realtimeSocket,
      socketState,
      wsErrorDetail,
      feed,
      queue,
      queueError,
      queueLoading,
      refreshQueue,
      apiReachable,
      lastHealthAt,
      lastQueueSync,
      lastSocketAt,
      now,
      loginError,
      soundMuted,
      setSoundMuted,
      voiceRing,
      dismissVoiceRing,
      callFocusIncidentId,
    ],
  );

  if (!booted) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-600 animate-live-pulse">
          Initializing command console…
        </p>
      </div>
    );
  }

  if (!tokens) {
    return (
      <OpsLoginView
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        loginError={loginError}
        apiConfigWarning={apiConfigWarning}
        onSubmit={(ev) => void login(ev)}
      />
    );
  }

  return (
    <OpsSessionContext.Provider value={ctx}>
      <OpsChrome>{children}</OpsChrome>
    </OpsSessionContext.Provider>
  );
}
