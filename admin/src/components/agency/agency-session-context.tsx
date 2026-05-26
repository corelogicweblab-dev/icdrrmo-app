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
import { AgencyChrome } from "@/components/agency/agency-chrome";
import { useAgencyChromeBridge } from "@/components/agency/agency-chrome-bridge";
import { AgencyLoginView } from "@/components/agency/agency-login-view";
import type { AgencyPortalConfig } from "@/components/agency/agency-config";
import {
  clearAgencyTokens,
  loadAgencyTokens,
  saveAgencyTokens,
} from "@/components/agency/agency-storage";
import { decodeJwtEmail } from "@/components/ops/ops-format";
import { getApiBaseUrl } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/api-fetch";
import { decodeJwtPayload } from "@/lib/decode-jwt-role";
import { signOutToHome } from "@/lib/unified-auth";
import type { TokenPair } from "@/components/ops/ops-types";

type AgencySessionContextValue = {
  config: AgencyPortalConfig;
  tokens: TokenPair;
};

const AgencySessionContext = createContext<AgencySessionContextValue | null>(null);

export function useAgencySession(): AgencySessionContextValue {
  const ctx = useContext(AgencySessionContext);
  if (!ctx) throw new Error("useAgencySession must be used within AgencySessionProvider");
  return ctx;
}

export function AgencySessionProvider({
  config,
  children,
}: {
  config: AgencyPortalConfig;
  children: ReactNode;
}): ReactElement {
  const [tokens, setTokens] = useState<TokenPair | null>(() => {
    if (typeof window === "undefined") return null;
    const t = loadAgencyTokens(config.storageKey);
    if (t?.accessToken && decodeJwtPayload(t.accessToken)?.role === config.role) return t;
    return null;
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const bridge = useAgencyChromeBridge();

  useEffect(() => {
    const t = loadAgencyTokens(config.storageKey);
    if (t?.accessToken && decodeJwtPayload(t.accessToken)?.role === config.role) {
      setTokens(t);
    } else if (t) {
      clearAgencyTokens(config.storageKey);
      setTokens(null);
    }
  }, [config.storageKey, config.role]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const logout = useCallback(() => {
    clearAgencyTokens(config.storageKey);
    setTokens(null);
    signOutToHome();
  }, [config.storageKey]);

  const ctx = useMemo(
    () => (tokens?.accessToken ? { config, tokens } : null),
    [config, tokens],
  );

  const onLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginBusy(true);
      setLoginError(null);
      try {
        const res = await fetchWithTimeout(`${getApiBaseUrl()}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = (await res.json()) as { accessToken?: string; message?: string };
        if (!res.ok || !data.accessToken) {
          setLoginError(typeof data.message === "string" ? data.message : "Sign-in failed");
          return;
        }
        if (decodeJwtPayload(data.accessToken)?.role !== config.role) {
          setLoginError(`This portal is for ${config.role} agency accounts only.`);
          return;
        }
        const pair = { accessToken: data.accessToken };
        saveAgencyTokens(config.storageKey, pair);
        setTokens(pair);
      } finally {
        setLoginBusy(false);
      }
    },
    [config.role, config.storageKey, email, password],
  );

  if (!tokens?.accessToken) {
    return (
      <AgencyLoginView
        config={config}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        loginError={loginError}
        loginBusy={loginBusy}
        onSubmit={(ev) => void onLogin(ev)}
      />
    );
  }

  const sessionLabel = decodeJwtEmail(tokens.accessToken) ?? `${config.role} session`;

  return (
    <AgencySessionContext.Provider value={ctx!}>
      <AgencyChrome
        config={config}
        sessionLabel={sessionLabel}
        socketLive={bridge.socketLive}
        openCount={bridge.openCount}
        loading={bridge.loading}
        onRefresh={bridge.onRefresh}
        onLogout={logout}
        now={now}
      >
        {children}
      </AgencyChrome>
    </AgencySessionContext.Provider>
  );
}
