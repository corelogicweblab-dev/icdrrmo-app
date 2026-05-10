/** Mapbox public token (client bundle). Set in `admin/.env.local` as `NEXT_PUBLIC_MAPBOX_TOKEN`. */
export function getMapboxToken(): string {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? "";
}

export function hasMapboxToken(): boolean {
  return getMapboxToken().length > 0;
}

/** Browser-safe public configuration (set at build time for Docker). */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "http://127.0.0.1:4000/api/v1";
}

/**
 * When the app is opened on a real host (not local dev) but the API URL still targets
 * this origin or localhost, login and REST calls will fail (often 404 on Firebase).
 */
export function getApiConfigWarning(): string | null {
  if (typeof window === "undefined") return null;
  const base = getApiBaseUrl();
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return null;
  if (base.startsWith("/")) {
    return "This build uses a relative API path. Rebuild with NEXT_PUBLIC_API_URL set to your HTTPS API base (e.g. https://api.yourdomain.com/api/v1). Static hosting cannot proxy /api/v1.";
  }
  if (/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\b/i.test(base)) {
    return "This build points the API at localhost. Rebuild with NEXT_PUBLIC_API_URL (and NEXT_PUBLIC_WS_URL) set to your deployed Nest origin.";
  }
  try {
    const apiHost = new URL(base).hostname;
    if (apiHost === "icdrrmo-app-1.onrender.com") {
      return "This build points at icdrrmo-app-1.onrender.com. Rebuild with NEXT_PUBLIC_API_URL=https://icdrrmo-api.onrender.com/api/v1 and NEXT_PUBLIC_WS_URL=https://icdrrmo-api.onrender.com (GitHub secret or admin/.env.deploy), then redeploy Firebase Hosting.";
    }
    if (apiHost === h) {
      return "NEXT_PUBLIC_API_URL points at this same hostname as the admin UI. Use your Nest API host (different subdomain or domain).";
    }
  } catch {
    return null;
  }
  return null;
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

/**
 * EOC / ops voice hotline opened after a successful citizen SOS (`tel:` link).
 * Example: `+639171234567` (E.164, no spaces). Set `NEXT_PUBLIC_OPS_VOICE_HOTLINE` at build time.
 */
export function getOpsVoiceHotline(): string | null {
  const raw = process.env.NEXT_PUBLIC_OPS_VOICE_HOTLINE?.trim();
  if (!raw) return null;
  const compact = raw.replace(/\s/g, "");
  if (!/^\+?\d{8,15}$/.test(compact)) return null;
  return compact.startsWith("+") ? compact : `+${compact}`;
}
