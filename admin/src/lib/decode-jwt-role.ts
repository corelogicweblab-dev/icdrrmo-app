/** Decode JWT payload (middle segment) without verifying signature — client-side UX only. */
export function decodeJwtPayload(token: string): { role?: string; sub?: string; email?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as { role?: string; sub?: string; email?: string };
  } catch {
    return null;
  }
}

export const OPS_CONSOLE_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "OPERATOR"]);

export function canAccessOpsConsole(accessToken: string | undefined): boolean {
  if (!accessToken) return false;
  const p = decodeJwtPayload(accessToken);
  return !!(p?.role && OPS_CONSOLE_ROLES.has(p.role));
}
