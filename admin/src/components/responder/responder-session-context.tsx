"use client";

import type { ReactElement, ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { loadOpsTokens } from "@/components/ops/ops-storage";
import type { TokenPair } from "@/components/ops/ops-types";
import { decodeJwtPayload } from "@/lib/decode-jwt-role";
import { loginWithRoleRouting, signOutToHome } from "@/lib/unified-auth";

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
    setTokens(null);
    signOutToHome();
  }, []);

  const value = useMemo(() => ({ tokens, logout }), [tokens, logout]);

  return <ResponderSessionContext.Provider value={value}>{children}</ResponderSessionContext.Provider>;
}

export function isResponderRole(accessToken: string | undefined): boolean {
  const p = accessToken ? decodeJwtPayload(accessToken) : null;
  return p?.role === "RESPONDER";
}

export async function responderLogin(email: string, password: string): Promise<TokenPair> {
  const result = await loginWithRoleRouting(email, password);
  if (!result.ok) throw new Error(result.message);
  const pair = loadOpsTokens();
  if (!pair?.accessToken) throw new Error("Sign-in succeeded but session was not saved.");
  return pair;
}
