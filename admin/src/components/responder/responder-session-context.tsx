"use client";

import type { ReactElement, ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "@/lib/env";
import { clearOpsTokens, loadOpsTokens, saveOpsTokens } from "@/components/ops/ops-storage";
import type { TokenPair } from "@/components/ops/ops-types";
import { decodeJwtPayload } from "@/lib/decode-jwt-role";

type Ctx = {
  tokens: TokenPair | null;
  logout: () => void;
};

const ResponderSessionContext = createContext<Ctx | null>(null);

export function useResponderSession(): Ctx {
  const v = useContext(ResponderSessionContext);
  if (!v) throw new Error("useResponderSession must be used under ResponderSessionProvider");
  return v;
}

export function ResponderSessionProvider({ children }: { children: ReactNode }): ReactElement {
  const [tokens, setTokens] = useState<TokenPair | null>(null);

  useEffect(() => {
    setTokens(loadOpsTokens());
  }, []);

  const logout = useCallback(() => {
    clearOpsTokens();
    setTokens(null);
  }, []);

  const value = useMemo(() => ({ tokens, logout }), [tokens, logout]);

  return <ResponderSessionContext.Provider value={value}>{children}</ResponderSessionContext.Provider>;
}

export function isResponderRole(accessToken: string | undefined): boolean {
  const p = accessToken ? decodeJwtPayload(accessToken) : null;
  return p?.role === "RESPONDER";
}

export async function responderLogin(email: string, password: string): Promise<TokenPair> {
  const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<TokenPair> & { message?: string };
  if (!res.ok) {
    throw new Error(typeof data.message === "string" ? data.message : `Sign-in failed (${res.status})`);
  }
  if (!data.accessToken) throw new Error("Invalid server response");
  const pair: TokenPair = { accessToken: data.accessToken };
  saveOpsTokens(pair);
  return pair;
}
