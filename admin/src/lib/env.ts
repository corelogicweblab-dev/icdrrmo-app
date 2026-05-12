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
 * When `NEXT_PUBLIC_SHOW_DEV_DIAGNOSTICS=true` at build time, operators may see detailed
 * deploy/build hints. Default off — end users see a generic support message only.
 */
export function showDevDiagnostics(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_DEV_DIAGNOSTICS === "true";
}

/**
 * Warn when this hosting origin likely cannot reach the API (mis-export, wrong host).
 * Detailed fix text only when {@link showDevDiagnostics} is enabled.
 */
export function getApiConfigWarning(): string | null {
  if (typeof window === "undefined") return null;
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return null;

  const base = getApiBaseUrl();
  let devDetail: string | null = null;

  if (base.startsWith("/")) {
    devDetail =
      "This build uses a relative API path. Rebuild with NEXT_PUBLIC_API_URL set to your HTTPS API base (e.g. https://api.yourdomain.com/api/v1). Static hosting cannot proxy /api/v1.";
  } else if (/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\b/i.test(base)) {
    devDetail =
      "This build points the API at localhost. Rebuild with NEXT_PUBLIC_API_URL (and NEXT_PUBLIC_WS_URL) set to your deployed Nest origin.";
  } else {
    try {
      const apiHost = new URL(base).hostname;
      if (apiHost === "icdrrmo-app-1.onrender.com") {
        devDetail =
          "This build points at icdrrmo-app-1.onrender.com. Rebuild with NEXT_PUBLIC_API_URL=https://icdrrmo-api.onrender.com/api/v1 and NEXT_PUBLIC_WS_URL=https://icdrrmo-api.onrender.com (GitHub secret or admin/.env.deploy), then redeploy Firebase Hosting.";
      } else if (apiHost === h) {
        devDetail =
          "NEXT_PUBLIC_API_URL points at this same hostname as the admin UI. Use your Nest API host (different subdomain or domain).";
      }
    } catch {
      return null;
    }
  }

  if (!devDetail) return null;
  if (showDevDiagnostics()) return devDetail;
  return "If sign-in or live data fails, contact your technical administrator to verify this console is linked to the emergency services backend.";
}

/**
 * Socket.IO origin (no path — client uses `/socket.io` on this host).
 * - Prefer `NEXT_PUBLIC_WS_URL` when set.
 * - Else, if `NEXT_PUBLIC_API_URL` is absolute (e.g. https://api.host/api/v1), use that **API host**
 *   so static hosting (Firebase) still reaches Nest — the page origin often has no Socket.IO server.
 * - Else in the browser, fall back to `window.location.origin` (Next dev rewrites /socket.io).
 */
export function getWsBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const api = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (api && /^https?:\/\//i.test(api)) {
    try {
      const u = new URL(api);
      return `${u.protocol}//${u.host}`;
    } catch {
      /* fall through */
    }
  }
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
