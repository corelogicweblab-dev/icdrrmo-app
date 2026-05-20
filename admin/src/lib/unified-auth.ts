import { getApiBaseUrl } from "@/lib/env";
import { decodeJwtPayload, OPS_CONSOLE_ROLES } from "@/lib/decode-jwt-role";
import { clearOpsTokens, saveOpsTokens } from "@/components/ops/ops-storage";
import type { TokenPair } from "@/components/ops/ops-types";

export const CITIZEN_STORAGE_KEY = "icdrrmo_citizen_tokens";

export type LoginRouteResult =
  | { ok: true; redirectTo: string }
  | { ok: false; message: string };

export function saveCitizenTokens(pair: TokenPair): void {
  localStorage.setItem(CITIZEN_STORAGE_KEY, JSON.stringify(pair));
}

export function loadCitizenTokens(): TokenPair | null {
  try {
    const raw = localStorage.getItem(CITIZEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TokenPair;
    return typeof parsed.accessToken === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function clearCitizenTokens(): void {
  localStorage.removeItem(CITIZEN_STORAGE_KEY);
}

/** Resolve dashboard path from JWT role (client-side UX only). */
export function dashboardPathForRole(role: string | undefined): string | null {
  if (!role) return null;
  if (role === "CITIZEN") return "/citizen";
  if (role === "RESPONDER") return "/responder";
  if (OPS_CONSOLE_ROLES.has(role)) return "/ops";
  return null;
}

export function dashboardPathForToken(accessToken: string): string | null {
  return dashboardPathForRole(decodeJwtPayload(accessToken)?.role);
}

export async function loginWithRoleRouting(
  email: string,
  password: string,
): Promise<LoginRouteResult> {
  const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<TokenPair> & { message?: string };
  if (!res.ok) {
    return {
      ok: false,
      message: typeof data.message === "string" ? data.message : `Sign-in failed (${res.status})`,
    };
  }
  if (!data.accessToken) {
    return { ok: false, message: "Invalid server response." };
  }

  const role = decodeJwtPayload(data.accessToken)?.role;
  const redirectTo = dashboardPathForRole(role);
  if (!redirectTo) {
    clearOpsTokens();
    clearCitizenTokens();
    return {
      ok: false,
      message: "This account is not authorized for citizen, responder, or operations access.",
    };
  }

  const pair: TokenPair = { accessToken: data.accessToken };
  if (role === "CITIZEN") {
    clearOpsTokens();
    saveCitizenTokens(pair);
  } else {
    clearCitizenTokens();
    saveOpsTokens(pair);
  }

  return { ok: true, redirectTo };
}
