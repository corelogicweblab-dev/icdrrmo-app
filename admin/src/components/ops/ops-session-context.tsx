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
import { getApiBaseUrl, getApiConfigWarning, getHealthCheckUrl } from "@/lib/env";
import { connectOpsRealtime, type IncidentCreatedPayload } from "@/lib/realtime";
import { OpsChrome } from "@/components/ops/ops-chrome";
import { OpsLoginView } from "@/components/ops/ops-login";
import {
  clearOpsTokens,
  loadOpsTokens,
  loadSoundMuted,
  saveOpsTokens,
  saveSoundMuted,
} from "@/components/ops/ops-storage";
import type { OpsIncident, TokenPair } from "@/components/ops/ops-types";

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
};

const OpsSessionContext = createContext<OpsSessionContextValue | null>(null);

export function useOpsSession(): OpsSessionContextValue {
  const v = useContext(OpsSessionContext);
  if (!v) throw new Error("useOpsSession must be used under OpsSessionProvider");
  return v;
}

export function OpsSessionProvider({ children }: { children: ReactNode }): ReactElement {
  const [email, setEmail] = useState("ops.admin@icdrrmo.local");
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

  const refreshQueue = useCallback(async (access: string) => {
    setQueueLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/incidents/queue`, {
        headers: { Authorization: `Bearer ${access}` },
      });
      if (res.status === 401) {
        setQueueError("Session expired. Sign in again.");
        return;
      }
      if (res.status === 403) {
        setQueueError("Insufficient permissions. Operations queue requires Admin or Operator role.");
        return;
      }
      if (!res.ok) {
        setQueueError(`Queue service returned HTTP ${res.status}. Verify API availability.`);
        return;
      }
      setQueueError(null);
      const data = (await res.json()) as OpsIncident[];
      setQueue(Array.isArray(data) ? data : []);
      setLastQueueSync(new Date());
    } catch {
      setQueueError("Unable to reach the incident queue. Confirm the API is online and URL rewrites are configured.");
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
    if (!tokens?.accessToken) return;
    void refreshQueue(tokens.accessToken);
    const socket: Socket = connectOpsRealtime(tokens.accessToken, {
      onIncidentCreated: (p: IncidentCreatedPayload) => {
        setFeed((f) =>
          [`${new Date().toISOString()} · INCIDENT_CREATED · ${p.incidentId}`, ...f].slice(0, 80),
        );
        if (!loadSoundMuted()) playIncidentChime();
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
    socket.on("connect", () => {
      setSocketState("live");
      setWsErrorDetail(null);
      setLastSocketAt(new Date());
    });
    socket.on("disconnect", () => setSocketState("off"));
    return () => {
      socket.removeAllListeners();
      socket.close();
    };
  }, [tokens, refreshQueue]);

  async function login(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoginError(null);
    const url = `${getApiBaseUrl()}/auth/login`;
    try {
      const res = await fetch(url, {
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
            "Authentication endpoint returned 404. On static hosting the browser calls NEXT_PUBLIC_API_URL on your API host — not this page. Rebuild with an absolute API URL (https://…/api/v1) and ensure Nest exposes POST /auth/login.",
          );
        } else if (res.status === 400) {
          setLoginError(
            `Login rejected (400): ${detail}. Check email/password format; dev emails like *.icdrrmo.local are allowed.`,
          );
        } else if (res.status === 401) {
          setLoginError(
            `${detail} If you never ran a seed on this API’s database, SSH/run: npm run db:seed (repo root) with DATABASE_URL pointing at that same DB.`,
          );
        } else {
          setLoginError(`Authentication failed (${res.status}): ${detail}`);
        }
        setFeed((f) =>
          [`${new Date().toISOString()} · AUTH_FAILURE · ${res.status}`, ...f].slice(0, 80),
        );
        return;
      }
      const raw = (await res.json()) as { accessToken?: string; refreshToken?: string };
      const pair: TokenPair = {
        accessToken: raw.accessToken ?? "",
        refreshToken: raw.refreshToken ?? "",
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
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const detail = err instanceof Error ? err.message : "Network error";
      const mixed =
        typeof window !== "undefined" &&
        window.location.protocol === "https:" &&
        api.startsWith("http:");
      setLoginError(
        mixed
          ? `Cannot reach ${api} (${detail}). This admin page is HTTPS but the API URL is HTTP — use https:// for the API or the browser blocks the request.`
          : `Cannot reach ${api} (${detail}). Confirm Nest is reachable from the internet, NEXT_PUBLIC_API_URL in this build points at it, and CORS_ORIGINS on the API includes ${origin || "your admin origin"}.`,
      );
      setFeed((f) => [`${new Date().toISOString()} · AUTH_NETWORK_ERROR`, ...f].slice(0, 80));
    }
  }

  function logout(): void {
    clearOpsTokens();
    setTokens(null);
    setSocketState("off");
    setQueue([]);
    setLoginError(null);
    setQueueError(null);
    setWsErrorDetail(null);
    setApiReachable(null);
    setLastQueueSync(null);
    setLastHealthAt(null);
    setLastSocketAt(null);
  }

  const ctx = useMemo<OpsSessionContextValue>(
    () => ({
      tokens,
      email,
      setEmail,
      password,
      setPassword,
      logout,
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
    }),
    [
      tokens,
      email,
      password,
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
    ],
  );

  if (!booted) {
    return (
      <div className="min-h-screen bg-[#060608] flex items-center justify-center">
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
