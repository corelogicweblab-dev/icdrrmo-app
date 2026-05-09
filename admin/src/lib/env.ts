/** Browser-safe public configuration (set at build time for Docker). */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "http://127.0.0.1:4000/api/v1";
}

/**
 * Socket.IO origin. If unset, uses the dashboard origin so `/socket.io` is proxied by Next
 * (`next.config.ts`) to Nest — avoids CORS/host mismatches during local dev.
 */
export function getWsBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "http://127.0.0.1:4000";
}

/** GET /api/v1/health/ready — confirms API can reach Postgres. */
export function getHealthCheckUrl(): string {
  const base = getApiBaseUrl().replace(/\/$/, "");
  return `${base}/health/ready`;
}
