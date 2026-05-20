import { ApiTimeoutError, fetchWithTimeout } from "@/lib/api-fetch";
import { getApiBaseUrl } from "@/lib/env";
import { decodeJwtPayload, isAccessTokenUsable, OPS_CONSOLE_ROLES } from "@/lib/decode-jwt-role";
import { clearOpsTokens, loadOpsTokens, saveOpsTokens } from "@/components/ops/ops-storage";
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

/** Drop expired or unrecognized tokens so auto-redirect does not loop. */
export function purgeInvalidStoredSessions(): void {
  const citizen = loadCitizenTokens();
  if (citizen?.accessToken && !isAccessTokenUsable(citizen.accessToken)) {
    clearCitizenTokens();
  }
  const ops = loadOpsTokens();
  if (ops?.accessToken && !isAccessTokenUsable(ops.accessToken)) {
    clearOpsTokens();
  }
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
  if (!isAccessTokenUsable(accessToken)) return null;
  return dashboardPathForRole(decodeJwtPayload(accessToken)?.role);
}

export async function loginWithRoleRouting(
  email: string,
  password: string,
): Promise<LoginRouteResult> {
  let res: Response;
  try {
    res = await fetchWithTimeout(`${getApiBaseUrl()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch (err: unknown) {
    if (err instanceof ApiTimeoutError) {
      return {
        ok: false,
        message:
          "Sign-in timed out. Start the API (npm run dev:api) and database (npm run db:setup), then try again.",
      };
    }
    const onLocal =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    return {
      ok: false,
      message: onLocal
        ? "Cannot reach the API. Run npm run db:setup, then npm run dev:api and npm run dev:admin."
        : "Cannot reach the emergency services server. Check your connection or contact support.",
    };
  }

  const data = (await res.json().catch(() => ({}))) as Partial<TokenPair> & {
    message?: string | string[];
  };
  if (!res.ok) {
    let detail =
      typeof data.message === "string"
        ? data.message
        : Array.isArray(data.message)
          ? data.message.join("; ")
          : "";
    if (res.status === 404) {
      detail =
        "Sign-in endpoint not found. On local dev, use npm run dev:admin (not static export) with the API running.";
    }
    return {
      ok: false,
      message: detail || `Sign-in failed (${res.status})`,
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

/** Hard navigation fallback when client router transition stalls. */
export function navigateAfterLogin(redirectTo: string): void {
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    if (window.location.pathname === "/" || window.location.pathname === "") {
      window.location.assign(redirectTo);
    }
  }, 1500);
}
