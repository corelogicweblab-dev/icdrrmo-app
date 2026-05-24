export type JwtPayloadClaims = {
  role?: string;
  sub?: string;
  email?: string;
  exp?: number;
};

/** Decode JWT payload (middle segment) without verifying signature — client-side UX only. */
export function decodeJwtPayload(token: string): JwtPayloadClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as JwtPayloadClaims;
  } catch {
    return null;
  }
}

/** True when token has a known app role and is not past `exp` (30s skew). */
export function isAccessTokenUsable(token: string | undefined): boolean {
  if (!token?.trim()) return false;
  const p = decodeJwtPayload(token);
  if (!p?.role) return false;
  if (typeof p.exp === "number" && p.exp * 1000 < Date.now() - 30_000) return false;
  if (p.role === "CITIZEN" || p.role === "RESPONDER" || p.role === "BARANGAY_CHAIRMAN" || p.role === "PNP" || p.role === "BFP") return true;
  return OPS_CONSOLE_ROLES.has(p.role ?? "");
}

export function isBarangayChairman(accessToken: string | undefined): boolean {
  if (!accessToken) return false;
  return decodeJwtPayload(accessToken)?.role === "BARANGAY_CHAIRMAN";
}

export const OPS_CONSOLE_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "OPERATOR", "AUDITOR"]);

export function isOpsAuditor(accessToken: string | undefined): boolean {
  return decodeJwtPayload(accessToken ?? "")?.role === "AUDITOR";
}

export function canAccessOpsConsole(accessToken: string | undefined): boolean {
  if (!accessToken) return false;
  const p = decodeJwtPayload(accessToken);
  return !!(p?.role && OPS_CONSOLE_ROLES.has(p.role));
}

const OPS_GLOBAL_ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

/** Full EOC admin (system health row, unrestricted ops nav). Operators excluded. */
export function isOpsGlobalAdmin(accessToken: string | undefined): boolean {
  if (!accessToken) return false;
  const p = decodeJwtPayload(accessToken);
  return !!(p?.role && OPS_GLOBAL_ADMIN_ROLES.has(p.role));
}
