/** Decode JWT payload (client-only; not verified — UI hints / role gating). */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (b64.length % 4)) % 4);
    const json = atob(b64 + pad);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function jwtRole(token: string | undefined): string | null {
  if (!token) return null;
  const p = decodeJwtPayload(token);
  const r = p?.role;
  return typeof r === "string" ? r : null;
}
